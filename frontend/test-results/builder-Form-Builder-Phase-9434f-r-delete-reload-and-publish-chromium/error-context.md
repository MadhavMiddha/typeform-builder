# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: builder.spec.ts >> Form Builder Phase 3 Audit >> should create form, add questions, edit title, reorder, delete, reload, and publish
- Location: tests\builder.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.reload: Test timeout of 30000ms exceeded.
Call log:
  - waiting for navigation until "load"
    - navigated to "http://localhost:3000/forms/22/edit"

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]
    - main [ref=f1e6]
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Form Builder Phase 3 Audit', () => {
  4  |   test('should create form, add questions, edit title, reorder, delete, reload, and publish', async ({ page }) => {
  5  |     // 1. Create a form
  6  |     await page.goto('/');
  7  |     await page.click('button:has-text("Create form")');
  8  |     
  9  |     // Check if we navigated to the builder
  10 |     await expect(page).toHaveURL(/\/forms\/\d+\/edit/, { timeout: 15000 });
  11 |     
  12 |     // 2. Edit title
  13 |     const titleInput = page.locator('header h1');
  14 |     await titleInput.click();
  15 |     const activeInput = page.locator('header input');
  16 |     await activeInput.fill('My Test Form via Playwright');
  17 |     await activeInput.press('Enter');
  18 |     
  19 |     // Wait for optimistic save
  20 |     await expect(page.locator('header h1')).toHaveText('My Test Form via Playwright');
  21 | 
  22 |     // 3. Add every question type
  23 |     const types = ['Short Text', 'Long Text', 'Email', 'Number', 'Multiple Choice', 'Dropdown', 'Yes/No', 'Rating'];
  24 |     const questionItems = page.getByTestId('question-list-item');
  25 |     for (const [index, type] of types.entries()) {
  26 |       await page.getByRole('button', { name: 'Add content' }).first().click();
  27 |       await page.getByRole('button', { name: type, exact: true }).click();
  28 |       await expect(questionItems).toHaveCount(index + 1, { timeout: 10000 });
  29 |     }
  30 |     
  31 |     // Ensure all 8 questions were added (plus welcome/thank you)
  32 |     // Left pane items
  33 |     await expect(questionItems).toHaveCount(8);
  34 | 
  35 |     // 4. Reorder by drag
  36 |     // Playwright drag and drop can be tricky with dnd-kit. We'll simulate drag and drop on the handles.
  37 |     const firstHandle = page.locator('.cursor-grab').first();
  38 |     const secondHandle = page.locator('.cursor-grab').nth(1);
  39 |     
  40 |     if (await firstHandle.isVisible() && await secondHandle.isVisible()) {
  41 |         await firstHandle.dragTo(secondHandle);
  42 |     }
  43 |     
  44 |     // 5. Delete with confirm
  45 |     const lastItemMenu = questionItems.last().getByRole('button', { name: /Actions for/ });
  46 |     await lastItemMenu.click();
  47 |     await page.click('text=Delete');
  48 |     
  49 |     // Confirm dialog
  50 |     const confirmDelete = page.locator('button:has-text("Delete")').last();
  51 |     await confirmDelete.click();
  52 |     
  53 |     // Verify count is 7
  54 |     await expect(questionItems).toHaveCount(7);
  55 | 
  56 |     // 6. Persistence after reload
  57 |     await page.waitForTimeout(1200);
> 58 |     await page.reload();
     |                ^ Error: page.reload: Test timeout of 30000ms exceeded.
  59 |     await expect(page.locator('header h1')).toHaveText('My Test Form via Playwright');
  60 |     await expect(questionItems).toHaveCount(7);
  61 | 
  62 |     // 7. Publish
  63 |     await page.click('button:has-text("Publish")');
  64 |     await page.click('text=Publish form');
  65 |     
  66 |     await expect(page.getByRole('button', { name: /Published/ })).toBeVisible({ timeout: 10000 });
  67 |   });
  68 | });
  69 | 
```