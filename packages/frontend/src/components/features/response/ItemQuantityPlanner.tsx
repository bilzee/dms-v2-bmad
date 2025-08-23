'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ResponseType, type ItemTemplateData } from '@dms/shared';
import { useResponseStore } from '@/stores/response.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';

interface ItemQuantityPlannerProps {
  responseType: ResponseType;
  initialItems?: { item: string; quantity: number; unit: string }[];
  onItemsUpdate: (items: { item: string; quantity: number; unit: string }[]) => void;
  className?: string;
}

interface ItemEntry {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  isFromTemplate: boolean;
  templateId?: string;
}

export function ItemQuantityPlanner({
  responseType,
  initialItems = [],
  onItemsUpdate,
  className,
}: ItemQuantityPlannerProps) {
  const [items, setItems] = useState<ItemEntry[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const { getTemplatesForResponseType, addItemTemplate } = useResponseStore();
  
  // Get templates for current response type
  const templates = useMemo(() => 
    getTemplatesForResponseType(responseType),
    [responseType, getTemplatesForResponseType]
  );

  // Get unique categories from templates
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [templates]);

  // Filtered templates based on selected category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return templates;
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  // Initialize items from props - use JSON comparison to prevent unnecessary updates
  useEffect(() => {
    if (initialItems.length > 0) {
      const currentItemsData = items.map(({ item, quantity, unit }) => ({ item, quantity, unit }));
      const initialItemsData = initialItems;
      
      // Only update if items actually changed
      if (JSON.stringify(currentItemsData) !== JSON.stringify(initialItemsData)) {
        const itemEntries: ItemEntry[] = initialItems.map((item, index) => ({
          id: `item-${index}`,
          item: item.item,
          quantity: item.quantity,
          unit: item.unit,
          isFromTemplate: false,
        }));
        setItems(itemEntries);
      }
    } else if (items.length > 0) {
      // Clear items if initialItems is empty but we have items
      setItems([]);
    }
  }, [initialItems]); // Only depend on initialItems

  // Notify parent when items change - avoid infinite loops
  useEffect(() => {
    const itemsData = items.map(({ item, quantity, unit }) => ({
      item,
      quantity,
      unit,
    }));
    onItemsUpdate(itemsData);
  }, [items]); // Remove onItemsUpdate from dependencies to prevent infinite loops

  // Add new empty item
  const addNewItem = () => {
    const newItem: ItemEntry = {
      id: `item-${Date.now()}`,
      item: '',
      quantity: 1,
      unit: '',
      isFromTemplate: false,
    };
    setItems(prev => [...prev, newItem]);
  };

  // Add item from template
  const addFromTemplate = (template: ItemTemplateData, suggestedQuantity?: number) => {
    const newItem: ItemEntry = {
      id: `item-${Date.now()}`,
      item: template.name,
      quantity: suggestedQuantity || template.suggestedQuantities?.[0] || 1,
      unit: template.defaultUnit,
      isFromTemplate: true,
      templateId: template.id,
    };
    setItems(prev => [...prev, newItem]);
    setShowTemplates(false);
  };

  // Update item field
  const updateItem = (id: string, field: keyof ItemEntry, value: string | number) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Bulk import from templates
  const bulkImportFromTemplates = () => {
    const templatesForType = getTemplatesForResponseType(responseType);
    const newItems: ItemEntry[] = templatesForType.map((template, index) => ({
      id: `bulk-${Date.now()}-${index}`,
      item: template.name,
      quantity: template.suggestedQuantities?.[0] || 1,
      unit: template.defaultUnit,
      isFromTemplate: true,
      templateId: template.id,
    }));
    
    setItems(prev => [...prev, ...newItems]);
  };

  // Clear all items
  const clearAllItems = () => {
    setItems([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Item & Quantity Planning</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2"
          >
            <span>📋</span>
            {showTemplates ? 'Hide Templates' : 'Show Templates'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addNewItem}
            className="flex items-center gap-2"
          >
            <span>+</span>
            Add Item
          </Button>
        </div>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              Item Templates ({responseType})
            </h4>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={bulkImportFromTemplates}
                className="text-xs"
              >
                Import All
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-gray-900">
                      {template.name}
                    </h5>
                    <p className="text-xs text-gray-500">{template.category}</p>
                    <p className="text-xs text-gray-400">
                      Default unit: {template.defaultUnit}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addFromTemplate(template)}
                    className="ml-2 text-xs py-1 px-2"
                  >
                    Add
                  </Button>
                </div>
                
                {/* Suggested Quantities */}
                {template.suggestedQuantities && template.suggestedQuantities.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {template.suggestedQuantities.slice(0, 3).map(qty => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => addFromTemplate(template, qty)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                      >
                        {qty} {template.defaultUnit}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No templates available for {selectedCategory === 'all' ? responseType : selectedCategory}</p>
            </div>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="mb-2">No items added yet</p>
            <Button
              type="button"
              variant="outline"
              onClick={addNewItem}
              className="text-sm"
            >
              Add Your First Item
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 px-2">
              <div className="col-span-5">Item Name</div>
              <div className="col-span-3">Quantity</div>
              <div className="col-span-3">Unit</div>
              <div className="col-span-1">Action</div>
            </div>

            {/* Items */}
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-2 items-center p-2 border rounded-lg ${
                  item.isFromTemplate ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="col-span-5">
                  <Input
                    type="text"
                    value={item.item}
                    onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                    placeholder="Enter item name..."
                    className="w-full"
                  />
                  {item.isFromTemplate && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        📋 Template
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-3">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full"
                  />
                </div>

                <div className="col-span-3">
                  <Input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                    placeholder="Unit..."
                    className="w-full"
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">
                Total items: {items.length}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllItems}
                  className="text-red-600 hover:text-red-800"
                >
                  Clear All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewItem}
                >
                  + Add Another
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}