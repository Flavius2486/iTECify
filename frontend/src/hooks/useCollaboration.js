import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { useEffect, useRef } from 'react'

const WS_BASE = 'ws://localhost:3000'

export function useCollaboration(editor, roomId, fileId) {
  const docRef = useRef(null)
  const providerRef = useRef(null)

  useEffect(() => {
    if (!editor || !roomId || !fileId) return

    const doc = new Y.Doc()
    const provider = new WebsocketProvider(
      `${WS_BASE}/collab/${roomId}`,
      fileId,
      doc
    )

    const type = doc.getText('collab-code')

    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    )

    docRef.current = doc
    providerRef.current = provider

    return () => {
      binding.destroy()
      provider.destroy()
      doc.destroy()
      docRef.current = null
    }
  }, [editor, roomId, fileId])

  function setContent(newCode) {
    const doc = docRef.current
    if (!doc) return
    const type = doc.getText('collab-code')
    doc.transact(() => {
      type.delete(0, type.length)
      type.insert(0, newCode)
    })
  }

  return { doc: docRef, provider: providerRef, setContent }
}
