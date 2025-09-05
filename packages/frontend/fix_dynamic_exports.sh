#!/bin/bash

# List of files with syntax errors
files=(
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/assessments/batch-approve/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/assessments/batch-reject/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/assessments/[id]/approve/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/assessments/[id]/reject/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/assessments/queue/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/responses/batch-approve/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/responses/batch-reject/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/responses/[id]/verify/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/responses/[id]/approve/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/responses/[id]/reject/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/responses/[id]/delivery-comparison/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/auto-approval/override/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/verification/auto-approval/test/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/incidents/[id]/timeline/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/incidents/[id]/entities/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/incidents/[id]/status/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/donors/[id]/commitments/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/responses/plan/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/responses/[id]/documentation/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/responses/[id]/complete/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/responses/[id]/delivery/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/responses/[id]/convert/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/responses/plans/[id]/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/config/auto-approval/rules/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/coordinator/resources/allocate/route.ts"
"/home/bilnigma/dev/dms-v2-bmad/packages/frontend/src/app/api/v1/coordinator/resources/available/route.ts"
)

for file in "${files[@]}"; do
    echo "Fixing $file"
    
    # Create a temp file to store the fixed content
    temp_file=$(mktemp)
    
    # Remove the incorrectly placed dynamic export and comment from import block
    sed '/^\/\/ Force this route to be dynamic$/d; /^export const dynamic = .force-dynamic.;$/d' "$file" > "$temp_file"
    
    # Add the dynamic export after the last import statement
    awk '
    /^import / { in_imports = 1; print; next }
    /^$/ && in_imports { 
        in_imports = 0; 
        print "// Force this route to be dynamic"
        print "export const dynamic = '\''force-dynamic'\'';"
        print; 
        next 
    }
    { print }
    ' "$temp_file" > "$file"
    
    rm "$temp_file"
done
