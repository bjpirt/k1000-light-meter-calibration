import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorage', () => {
  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', [1, 2, 3]))
    expect(result.current[0]).toEqual([1, 2, 3])
  })

  it('persists a value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    act(() => { result.current[1](42) })
    expect(localStorage.getItem('test-key')).toBe('42')
  })

  it('updates the returned state when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    act(() => { result.current[1]('updated') })
    expect(result.current[0]).toBe('updated')
  })

  it('reads a previously stored value on mount', () => {
    localStorage.setItem('test-key', JSON.stringify({ foo: 'bar' }))
    const { result } = renderHook(() => useLocalStorage('test-key', {}))
    expect(result.current[0]).toEqual({ foo: 'bar' })
  })

  it('falls back to initial value when stored JSON is invalid', () => {
    localStorage.setItem('test-key', 'not-valid-json{{{')
    const { result } = renderHook(() => useLocalStorage('test-key', 99))
    expect(result.current[0]).toBe(99)
  })

  it('works with array values', () => {
    const initial = [{ a: 1 }, { a: 2 }]
    const { result } = renderHook(() => useLocalStorage('test-key', initial))
    act(() => { result.current[1]([{ a: 3 }]) })
    expect(result.current[0]).toEqual([{ a: 3 }])
    expect(JSON.parse(localStorage.getItem('test-key')!)).toEqual([{ a: 3 }])
  })
})
