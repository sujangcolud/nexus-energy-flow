# Commands to Fix Error Handling in Other Components

The following components still need error handling fixes. Run these manually:

## ExpensesTab.tsx

```bash
# Add import:
# import { extractErrorMessage, logError } from "@/utils/errorHandling";

# Replace error handlers:
# console.error("Error fetching categories:", error); → logError("fetching categories", error);
# toast.error("Failed to load categories"); → toast.error(`Failed to load categories: ${extractErrorMessage(error)}`);
```

## MenuManagementTab.tsx

```bash
# Add import and fix similar patterns
```

## ChargingTab.tsx

```bash
# Add import and fix similar patterns
```

## WithdrawalsTab.tsx

```bash
# Add import and fix similar patterns
```

## CooperativeSavingsTab.tsx

```bash
# Add import and fix similar patterns
```

## ExpenseBookingsTab.tsx

```bash
# Add import and fix similar patterns
```

The pattern for all is:

1. Add import: `import { extractErrorMessage, logError } from "@/utils/errorHandling";`
2. Replace: `console.error("Error doing X:", error);` with `logError("doing X", error);`
3. Replace: `toast.error("Failed to do X");` with `toast.error(\`Failed to do X: \${extractErrorMessage(error)}\`);`
