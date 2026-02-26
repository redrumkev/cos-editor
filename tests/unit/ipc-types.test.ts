import { describe, expect, it } from 'vitest'
import { IPC } from '../../src/shared/ipc'

describe('IPC channels', () => {
  it('defines all required channel constants', () => {
    expect(IPC.BUFFER_OPEN).toBe('buffer:open')
    expect(IPC.BUFFER_SAVE).toBe('buffer:save')
    expect(IPC.BUFFER_APPLY_CHANGES).toBe('buffer:apply-changes')
    expect(IPC.SETTINGS_GET).toBe('settings:get')
    expect(IPC.SETTINGS_SET).toBe('settings:set')
    expect(IPC.SETTINGS_TEST_CONNECTION).toBe('settings:test-connection')
    expect(IPC.BUFFER_STATE).toBe('buffer:state')
    expect(IPC.COS_STATUS).toBe('cos:status')
  })

  it('channel values are unique', () => {
    const values = Object.values(IPC)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})
