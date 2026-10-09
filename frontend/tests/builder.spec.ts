import { test, expect } from '@playwright/test';

test.describe('Form Builder Phase 3 Audit', () => {
  test('should create form, add questions, edit title, reorder, delete, reload, and publish', async ({ page }) => {
    // 1. Create a form
    await page.goto('/');
    await page.click('button:has-text("Create form")');
    
    // Check if we navigated to the builder
    await expect(page).toHaveURL(/\/forms\/\d+\/edit/, { timeout: 15000 });
    
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
    const questionItems = page.getByTestId('question-list-item');
    for (const [index, type] of types.entries()) {
      await page.getByRole('button', { name: 'Add content' }).first().click();
      await page.getByRole('button', { name: type, exact: true }).click();
      await expect(questionItems).toHaveCount(index + 1, { timeout: 10000 });
    }
    
    // Ensure all 8 questions were added (plus welcome/thank you)
    // Left pane items
    await expect(questionItems).toHaveCount(8);

    // 4. Reorder by drag
    // Playwright drag and drop can be tricky with dnd-kit. We'll simulate drag and drop on the handles.
    const firstHandle = page.locator('.cursor-grab').first();
    const secondHandle = page.locator('.cursor-grab').nth(1);
    
    if (await firstHandle.isVisible() && await secondHandle.isVisible()) {
        await firstHandle.dragTo(secondHandle);
    }
    
    // 5. Delete with confirm
    const lastItemMenu = questionItems.last().getByRole('button', { name: /Actions for/ });
    await lastItemMenu.click();
    await page.click('text=Delete');
    
    // Confirm dialog
    const confirmDelete = page.locator('button:has-text("Delete")').last();
    await confirmDelete.click();
    
    // Verify count is 7
    await expect(questionItems).toHaveCount(7);

    // 6. Persistence after reload
    await page.waitForTimeout(1200);
    await page.reload();
    await expect(page.locator('header h1')).toHaveText('My Test Form via Playwright');
    await expect(questionItems).toHaveCount(7);

    // 7. Publish
    await page.click('button:has-text("Publish")');
    await page.click('text=Publish form');
    
    await expect(page.getByRole('button', { name: /Published/ })).toBeVisible({ timeout: 10000 });
  });
});
