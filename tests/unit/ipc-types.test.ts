import { describe, expect, it } from 'vitest'
import { IPC } from '../../src/shared/ipc'

describe('IPC channels', () => {
  it('defines all required channel constants', () => {
    expect(IPC.BUFFER_OPEN).toBe('buffer:open')
    expect(IPC.BUFFER_SAVE).toBe('buffer:save')
    expect(IPC.BUFFER_APPLY_CHANGES).toBe('buffer:apply-changes')
    expect(IPC.BUFFER_RELOAD).toBe('buffer:reload')
    expect(IPC.BUFFER_FORCE_SAVE).toBe('buffer:force-save')
    expect(IPC.BUFFER_ACCEPT_DRAFT).toBe('buffer:accept-draft')
    expect(IPC.SETTINGS_GET).toBe('settings:get')
    expect(IPC.SETTINGS_SET).toBe('settings:set')
    expect(IPC.SETTINGS_TEST_CONNECTION).toBe('settings:test-connection')
    expect(IPC.BUFFER_STATE).toBe('buffer:state')
    expect(IPC.BUFFER_CONFLICT).toBe('buffer:conflict')
    expect(IPC.COS_STATUS).toBe('cos:status')
    expect(IPC.NAV_LIST_BOOKS).toBe('nav:list-books')
    expect(IPC.NAV_LOAD_MANUSCRIPT).toBe('nav:load-manuscript')
    expect(IPC.NAV_LOAD_HISTORY).toBe('nav:load-history')
    expect(IPC.NAV_LOAD_VERSION).toBe('nav:load-version')
    expect(IPC.NAV_RESTORE_VERSION).toBe('nav:restore-version')
  })

  it('channel values are unique', () => {
    const values = Object.values(IPC)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})
