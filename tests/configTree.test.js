import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addNode,
  buildOptions,
  fromFlatList,
  moveNode,
  removeNode,
  reorderNode,
} from '../src/utils/configTree.js'

test('config tree helpers dedupe and build options', () => {
  const tree = fromFlatList(['HG', 'RG', 'HG'])
  assert.equal(tree.length, 2)

  const options = buildOptions(tree)
  assert.deepEqual(
    options.map((item) => item.value),
    ['HG', 'RG'],
  )
})

test('config tree supports add move and remove', () => {
  const root = fromFlatList(['HG', 'RG'])
  const next = addNode(root, root[0].id, 'HGUC')
  assert.equal(next[0].children[0].label, 'HGUC')

  const moved = moveNode(next, next[1].id, 'up')
  assert.equal(moved[0].label, 'RG')

  const result = removeNode(moved, moved[0].id)
  assert.equal(result.tree.length, 1)
  assert.equal(result.removed.label, 'RG')
})

test('config tree supports drag reorder within the same level', () => {
  const root = fromFlatList(['HG', 'RG', 'MG'])

  const movedAfter = reorderNode(root, root[0].id, root[2].id, 'after')
  assert.deepEqual(
    movedAfter.map((item) => item.label),
    ['RG', 'MG', 'HG'],
  )

  const movedBefore = reorderNode(root, root[2].id, root[0].id, 'before')
  assert.deepEqual(
    movedBefore.map((item) => item.label),
    ['MG', 'HG', 'RG'],
  )
})

test('config tree drag reorder does not cross parent levels', () => {
  const root = fromFlatList(['HG', 'RG'])
  const next = addNode(root, root[0].id, 'HGUC')

  const moved = reorderNode(next, next[0].children[0].id, next[1].id, 'before')
  assert.equal(moved[0].children[0].label, 'HGUC')
  assert.equal(moved[1].label, 'RG')
})
