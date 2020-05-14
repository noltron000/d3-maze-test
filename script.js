import Maze from './node_modules/maze-algorithms/lib/index.js'

console.log('gotcha')

// declare elements, which will be kept track of.
const el = {}
el.maze = document.getElementById('maze')
el.data = el.maze.getElementsByTagName('data')

console.log(Maze([2,3]))

import test from './testing.js'
test()
