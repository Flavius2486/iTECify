import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { useEffect, useRef } from 'react'

const WS_BASE = 'ws://localhost:3000'

export function useCollaboration(editor, roomId, fileId, myColor, myUsername, initialContent) {
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

    if (myColor) {
      provider.awareness.setLocalStateField('user', { color: myColor, username: myUsername || '' })
    }

    const type = doc.getText('collab-code')

    // Când provider-ul se sincronizează prima dată, dacă documentul e gol
    // și avem conținut inițial, îl inserăm
    provider.on('sync', (isSynced) => {
      if (isSynced && type.length === 0 && initialContent) {
        doc.transact(() => {
          type.insert(0, initialContent)
        })
      }
    })

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

  // Actualizăm culoarea în awareness când se schimbă (participants se încarcă async)
  useEffect(() => {
    if (!providerRef.current || !myColor) return
    providerRef.current.awareness.setLocalStateField('user', { color: myColor, username: myUsername || '' })
  }, [myColor, myUsername])

  function setContent(newCode) {
    const doc = docRef.current
    if (!doc) return
    const type = doc.getText('collab-code')
    doc.transact(() => {
      type.delete(0, type.length)
      type.insert(0, newCode)
    })
  }

  return { doc: docRef, provider: providerRef, setContent }}
