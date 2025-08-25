"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  RapidResponse, 
  ResponseData, 
  Feedback, 
  ResubmissionLog, 
  MediaAttachment,
  ResponseType
} from "@dms/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  Save, 
  Send, 
  X, 
  FileText, 
  Camera,
  CheckCircle2
} from "lucide-react";

// Form schema for resubmission
const resubmissionSchema = z.object({
  changesDescription: z.string()
    .min(10, "Please provide a detailed description of changes (minimum 10 characters)")
    .max(1000, "Description must be less than 1000 characters"),
  addressedFeedbackIds: z.array(z.string())
    .min(1, "Please select at least one feedback item that you're addressing"),
  correctedData: z.record(z.any()).optional(),
  updatedEvidence: z.array(z.any()).optional(),
});

type ResubmissionFormData = z.infer<typeof resubmissionSchema>;

interface ResponseResubmissionProps {
  response: RapidResponse;
  feedback: Feedback[];
  onSubmit: (data: ResubmissionFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  isOffline?: boolean;
}

export function ResponseResubmission({
  response,
  feedback,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isOffline = false
}: ResponseResubmissionProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const form = useForm<ResubmissionFormData>({
    resolver: zodResolver(resubmissionSchema),
    defaultValues: {
      changesDescription: "",
      addressedFeedbackIds: [],
      correctedData: response.data,
    },
  });

  // Filter feedback to only show items that require response
  const actionableFeedback = feedback.filter(f => 
    f.targetId === response.id && 
    f.requiresResponse && 
    !f.isResolved &&
    f.feedbackType !== 'APPROVAL_NOTE'
  );

  // Handle file selection for updated evidence
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Check file type
      return file.type.startsWith('image/') || file.type === 'application/pdf';
    });

    if (validFiles.length !== files.length) {
      // Show warning about invalid files
      console.warn("Some files were not added. Only images and PDFs are supported.");
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Create preview URLs for images
    const newPreviewUrls = validFiles.map(file => 
      file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    );
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      // Clean up object URL
      if (prev[index]) {
        URL.revokeObjectURL(prev[index]);
      }
      return newUrls;
    });
  };

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleFormSubmit = async (data: ResubmissionFormData) => {
    try {
      // Convert selected files to MediaAttachment format
      const updatedEvidence: MediaAttachment[] = selectedFiles.map((file, index) => ({
        id: `resubmission_${Date.now()}_${index}`,
        localPath: URL.createObjectURL(file),
        mimeType: file.type,
        size: file.size,
        metadata: {
          timestamp: new Date(),
        },
      }));

      await onSubmit({
        ...data,
        updatedEvidence,
      });
    } catch (error) {
      console.error("Resubmission failed:", error);
    }
  };

  const getRejectionFeedback = () => {
    return actionableFeedback.filter(f => f.feedbackType === 'REJECTION');
  };

  const getClarificationFeedback = () => {
    return actionableFeedback.filter(f => f.feedbackType === 'CLARIFICATION_REQUEST');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Response Resubmission
          </CardTitle>
          <CardDescription>
            Address coordinator feedback and resubmit your response for review
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Response Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Response Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Response ID:</span> {response.id.slice(-8)}
              </div>
              <div>
                <span className="font-medium">Type:</span> {response.responseType}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <Badge variant="destructive" className="ml-2">
                  {response.verificationStatus}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Planned Date:</span> {' '}
                {new Date(response.plannedDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Feedback to Address */}
          <div className="space-y-4">
            <h3 className="font-semibold text-red-600">
              Feedback Requiring Attention ({actionableFeedback.length})
            </h3>
            
            {actionableFeedback.length === 0 ? (
              <p className="text-muted-foreground">
                No actionable feedback found for this response.
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {/* Rejections */}
                  {getRejectionFeedback().map((item) => (
                    <Card key={item.id} className="border-red-200 bg-red-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            REJECTION
                          </Badge>
                          <Badge variant="outline">
                            {item.priority}
                          </Badge>
                        </div>
                        
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-semibold">Coordinator:</span> {item.coordinatorName}
                          </div>
                          <div>
                            <span className="font-semibold">Reason:</span> {item.reason.replace('_', ' ')}
                          </div>
                          <div>
                            <span className="font-semibold">Comments:</span>
                            <p className="mt-1 p-2 bg-white rounded border">
                              {item.comments}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Clarification Requests */}
                  {getClarificationFeedback().map((item) => (
                    <Card key={item.id} className="border-orange-200 bg-orange-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary">
                            CLARIFICATION REQUEST
                          </Badge>
                          <Badge variant="outline">
                            {item.priority}
                          </Badge>
                        </div>
                        
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-semibold">Coordinator:</span> {item.coordinatorName}
                          </div>
                          <div>
                            <span className="font-semibold">Reason:</span> {item.reason.replace('_', ' ')}
                          </div>
                          <div>
                            <span className="font-semibold">Comments:</span>
                            <p className="mt-1 p-2 bg-white rounded border">
                              {item.comments}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Resubmission Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Feedback Selection */}
              <FormField
                control={form.control}
                name="addressedFeedbackIds"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Select Feedback Items Being Addressed *
                    </FormLabel>
                    <FormDescription>
                      Check all feedback items that your resubmission addresses
                    </FormDescription>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                      {actionableFeedback.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="addressedFeedbackIds"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== item.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  {item.feedbackType.replace('_', ' ')} - {item.reason.replace('_', ' ')}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {item.comments.length > 100 
                                    ? `${item.comments.substring(0, 100)}...` 
                                    : item.comments
                                  }
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Changes Description */}
              <FormField
                control={form.control}
                name="changesDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Description of Changes *
                    </FormLabel>
                    <FormDescription>
                      Provide a detailed explanation of how you have addressed the feedback
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the specific changes you have made to address the coordinator feedback. Be detailed and specific about what was corrected or improved."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground text-right">
                      {field.value?.length || 0}/1000 characters
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Updated Evidence Upload */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-2">Updated Evidence (Optional)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload additional or corrected photos/documents to support your resubmission
                  </p>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="evidence-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload images or PDFs
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: JPG, PNG, PDF (Max 10MB each)
                    </p>
                  </label>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <Card>
                            <CardContent className="p-2">
                              {previewUrls[index] ? (
                                <img
                                  src={previewUrls[index]}
                                  alt={file.name}
                                  className="w-full h-20 object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <p className="text-xs mt-1 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                
                <div className="space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      // Save as draft functionality
                      console.log("Saving as draft...");
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting || actionableFeedback.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Resubmission
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {/* Offline Mode Indicator */}
          {isOffline && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-orange-800">
                  Offline Mode
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Your resubmission will be queued for sync when connection is restored
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}