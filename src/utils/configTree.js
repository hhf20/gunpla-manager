function uid(prefix = 'n') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function cleanLabel(label) {
  return String(label || '').trim()
}

function sanitizeNode(node) {
  const label = cleanLabel(node?.label)
  if (!label) return null
  const childrenRaw = Array.isArray(node?.children) ? node.children : []
  const children = childrenRaw.map(sanitizeNode).filter(Boolean)
  return {
    id: typeof node?.id === 'string' && node.id ? node.id : uid('cfg'),
    label,
    logoUrl: typeof node?.logoUrl === 'string' ? node.logoUrl : '',
    children,
  }
}

export function sanitizeTree(nodes) {
  if (!Array.isArray(nodes)) return []
  return nodes.map(sanitizeNode).filter(Boolean)
}

export function fromFlatList(values) {
  if (!Array.isArray(values)) return []
  const set = new Set()
  const out = []
  for (const value of values) {
    const label = cleanLabel(value)
    if (!label || set.has(label)) continue
    set.add(label)
    out.push({ id: uid('cfg'), label, logoUrl: '', children: [] })
  }
  return out
}

export function flattenLabels(nodes) {
  const out = []
  const walk = (list) => {
    for (const node of list || []) {
      out.push(node.label)
      walk(node.children)
    }
  }
  walk(nodes || [])
  return out
}

export function buildOptions(nodes) {
  const out = []
  const walk = (list, trail) => {
    for (const node of list || []) {
      const nextTrail = [...trail, node.label]
      out.push({
        id: node.id,
        value: node.label,
        path: nextTrail.join(' / '),
      })
      walk(node.children, nextTrail)
    }
  }
  walk(nodes || [], [])
  return out
}

export function findNode(nodes, nodeId) {
  const walk = (list, parent = null) => {
    for (let i = 0; i < (list || []).length; i += 1) {
      const node = list[i]
      if (node.id === nodeId) return { node, parent, index: i }
      const found = walk(node.children, node)
      if (found) return found
    }
    return null
  }
  return walk(nodes || [])
}

export function findNodeByLabel(nodes, label) {
  const target = cleanLabel(label)
  if (!target) return null
  const walk = (list) => {
    for (const node of list || []) {
      if (node.label === target) return node
      const found = walk(node.children)
      if (found) return found
    }
    return null
  }
  return walk(nodes || [])
}

export function hasLabel(nodes, label, excludeNodeId = '') {
  const target = cleanLabel(label)
  if (!target) return false
  const walk = (list) => {
    for (const node of list || []) {
      if (node.id !== excludeNodeId && cleanLabel(node.label) === target) return true
      if (walk(node.children)) return true
    }
    return false
  }
  return walk(nodes || [])
}

export function collectSubtreeLabels(node) {
  const out = []
  const walk = (n) => {
    if (!n) return
    out.push(n.label)
    for (const c of n.children || []) walk(c)
  }
  walk(node)
  return out
}

export function addNode(nodes, parentId, label) {
  const nextLabel = cleanLabel(label)
  if (!nextLabel) return nodes || []
  const next = structuredClone(nodes || [])
  if (!parentId) {
    next.push({ id: uid('cfg'), label: nextLabel, logoUrl: '', children: [] })
    return next
  }
  const found = findNode(next, parentId)
  if (!found?.node) return next
  found.node.children = found.node.children || []
  found.node.children.push({ id: uid('cfg'), label: nextLabel, logoUrl: '', children: [] })
  return next
}

export function renameNode(nodes, nodeId, label) {
  const nextLabel = cleanLabel(label)
  if (!nextLabel) return nodes || []
  const next = structuredClone(nodes || [])
  const found = findNode(next, nodeId)
  if (!found?.node) return next
  found.node.label = nextLabel
  return next
}

export function removeNode(nodes, nodeId) {
  const next = structuredClone(nodes || [])
  const found = findNode(next, nodeId)
  if (!found?.node) return { tree: next, removed: null }
  if (!found.parent) {
    const removed = next.splice(found.index, 1)?.[0] || null
    return { tree: next, removed }
  }
  const removed = found.parent.children.splice(found.index, 1)?.[0] || null
  return { tree: next, removed }
}

export function setNodeLogo(nodes, nodeId, logoUrl) {
  const next = structuredClone(nodes || [])
  const found = findNode(next, nodeId)
  if (!found?.node) return next
  found.node.logoUrl = typeof logoUrl === 'string' ? logoUrl : ''
  return next
}

export function moveNode(nodes, nodeId, direction) {
  const next = structuredClone(nodes || [])
  const found = findNode(next, nodeId)
  if (!found?.node) return next

  const siblings = found.parent ? found.parent.children : next
  const offset = direction === 'down' ? 1 : -1
  const targetIndex = found.index + offset

  if (targetIndex < 0 || targetIndex >= siblings.length) return next

  const [item] = siblings.splice(found.index, 1)
  siblings.splice(targetIndex, 0, item)
  return next
}
