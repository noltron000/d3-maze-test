import Maze from './maze.js'


// declare elements, which will be kept track of.
const el = {}
el.maze = document.getElementById('maze')
el.data = el.maze.getElementsByTagName('data')

console.log(Maze([2,3]))
