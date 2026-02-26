import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { _electron as electron } from 'playwright'

test.describe('App Launch', () => {
  test('electron app launches and renders', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../../out/main/index.js')],
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    // Verify both mount points exist
    const root = await window.$('#root')
    expect(root).not.toBeNull()

    const editorRoot = await window.$('#editor-root')
    expect(editorRoot).not.toBeNull()

    // Verify status bar renders
    const statusBar = await window.$('[data-testid="status-bar"]')
    expect(statusBar).not.toBeNull()

    await app.close()
  })
})
