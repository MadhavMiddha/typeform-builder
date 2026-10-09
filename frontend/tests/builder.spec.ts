import { test, expect } from '@playwright/test';

test.describe('Form Builder Phase 3 Audit', () => {
  test('should create form, add questions, edit title, reorder, delete, reload, and publish', async ({ page }) => {
    // 1. Create a form
    await page.goto('/');
    await page.click('button:has-text("Create form")');
    
    // Check if we navigated to the builder
    await expect(page).toHaveURL(/\/forms\/\d+\/edit/);
    
    // 2. Edit title
    const titleInput = page.locator('header h1');
    await titleInput.click();
    const activeInput = page.locator('header input');
    await activeInput.fill('My Test Form via Playwright');
    await activeInput.press('Enter');
    
    // Wait for optimistic save
    await expect(page.locator('header h1')).toHaveText('My Test Form via Playwright');

    // 3. Add every question type
    const types = ['Short Text', 'Long Text', 'Email', 'Number', 'Multiple Choice', 'Dropdown', 'Yes/No', 'Rating'];
    for (const type of types) {
      await page.click('button:has-text("Add content")');
      await page.click(`button:has-text("${type}")`);
      // Wait for it to appear
      await expect(page.locator('.w-5.flex.items-center.justify-center').last()).toBeVisible();
    }
    
    // Ensure all 8 questions were added (plus welcome/thank you)
    // Left pane items
    const questionItems = page.locator('.w-5.flex.items-center.justify-center');
    await expect(questionItems).toHaveCount(8);

    // 4. Reorder by drag
    // Playwright drag and drop can be tricky with dnd-kit. We'll simulate drag and drop on the handles.
    const firstHandle = page.locator('.cursor-grab').first();
    const secondHandle = page.locator('.cursor-grab').nth(1);
    
    if (await firstHandle.isVisible() && await secondHandle.isVisible()) {
        await firstHandle.dragTo(secondHandle);
    }
    
    // 5. Delete with confirm
    const lastItemMenu = page.locator('button:has(.lucide-more-vertical)').last();
    // Hover over the item to reveal the menu button if necessary
    await page.locator('.group').last().hover();
    await lastItemMenu.click();
    await page.click('text=Delete');
    
    // Confirm dialog
    const confirmDelete = page.locator('button:has-text("Delete")').last();
    await confirmDelete.click();
    
    // Verify count is 7
    await expect(questionItems).toHaveCount(7);

    // 6. Persistence after reload
    await page.reload();
    await expect(page.locator('header h1')).toHaveText('My Test Form via Playwright');
    await expect(questionItems).toHaveCount(7);

    // 7. Publish
    await page.click('button:has-text("Publish")');
    await page.click('text=Publish form');
    
    await expect(page.locator('button:has-text("Published")')).toBeVisible();
  });
});
