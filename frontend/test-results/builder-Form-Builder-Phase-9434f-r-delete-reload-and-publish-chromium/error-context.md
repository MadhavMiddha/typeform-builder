# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: builder.spec.ts >> Form Builder Phase 3 Audit >> should create form, add questions, edit title, reorder, delete, reload, and publish
- Location: tests\builder.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('.w-5.flex.items-center.justify-center').last()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" locator('.w-5.flex.items-center.justify-center').last() with timeout 5000ms
  - waiting for locator('.w-5.flex.items-center.justify-center').last()
    13 × locator resolved to <div class="w-5 h-5 flex items-center justify-center text-[#0EC290] shrink-0 mt-0.5 sm:mt-0">…</div>
       - unexpected value "hidden"

```

```yaml
- banner:
  - button "Back to dashboard"
  - heading "My Test Form via Playwright" [level=1]
  - text: Saving...
  - navigation:
    - button "Create"
    - button "Share" [disabled]
    - button "Results" [disabled]
  - button "Preview" [disabled]
  - button "Publish"
- heading "Content" [level=2]
- text: 👋 Welcome Screen Welcome to this form
- button "Drag question"
- text: 1 ...
- button "Actions for question"
- status
- button "Add content"
- text: 🏁 End Screen Thanks for completing this form! 1 →
- heading [level=2]
- paragraph: Description (optional)
- textbox "Type your answer here..."
- text: Type
- combobox "Question type":
  - option "short text" [selected]
  - option "long text"
  - option "email"
  - option "number"
  - option "multiple choice"
  - option "dropdown"
  - option "yes no"
  - option "rating"
- text: Required
- switch
- text: Placeholder text
- textbox
- region "Notifications alt+T"
- alert: My workspace
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
  10 |     await expect(page).toHaveURL(/\/forms\/\d+\/edit/);
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
  24 |     for (const type of types) {
  25 |       await page.click('button:has-text("Add content")');
  26 |       await page.click(`button:has-text("${type}")`);
  27 |       // Wait for it to appear
> 28 |       await expect(page.locator('.w-5.flex.items-center.justify-center').last()).toBeVisible();
     |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  29 |     }
  30 |     
  31 |     // Ensure all 8 questions were added (plus welcome/thank you)
  32 |     // Left pane items
  33 |     const questionItems = page.locator('.w-5.flex.items-center.justify-center');
  34 |     await expect(questionItems).toHaveCount(8);
  35 | 
  36 |     // 4. Reorder by drag
  37 |     // Playwright drag and drop can be tricky with dnd-kit. We'll simulate drag and drop on the handles.
  38 |     const firstHandle = page.locator('.cursor-grab').first();
  39 |     const secondHandle = page.locator('.cursor-grab').nth(1);
  40 |     
  41 |     if (await firstHandle.isVisible() && await secondHandle.isVisible()) {
  42 |         await firstHandle.dragTo(secondHandle);
  43 |     }
  44 |     
  45 |     // 5. Delete with confirm
  46 |     const lastItemMenu = page.locator('button:has(.lucide-more-vertical)').last();
  47 |     // Hover over the item to reveal the menu button if necessary
  48 |     await page.locator('.group').last().hover();
  49 |     await lastItemMenu.click();
  50 |     await page.click('text=Delete');
  51 |     
  52 |     // Confirm dialog
  53 |     const confirmDelete = page.locator('button:has-text("Delete")').last();
  54 |     await confirmDelete.click();
  55 |     
  56 |     // Verify count is 7
  57 |     await expect(questionItems).toHaveCount(7);
  58 | 
  59 |     // 6. Persistence after reload
  60 |     await page.reload();
  61 |     await expect(page.locator('header h1')).toHaveText('My Test Form via Playwright');
  62 |     await expect(questionItems).toHaveCount(7);
  63 | 
  64 |     // 7. Publish
  65 |     await page.click('button:has-text("Publish")');
  66 |     await page.click('text=Publish form');
  67 |     
  68 |     await expect(page.locator('button:has-text("Published")')).toBeVisible();
  69 |   });
  70 | });
  71 | 
```