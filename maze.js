class Cell {
    constructor(id) {
        // each cell has a unique "ID".
        // this "ID" is associated with its index in the map.
        this.id = id;
        // a cell "status" can equal one of several things:
        // -> unvisited
        // -> active (currently being modified)
        // -> passive (partially completed)
        // -> complete
        this.status = 'unvisited';
        // a "neighbor" is an accessible cell.
        // "neighbors" holds direction/neighbor pairings.
        // each valid direction holds a nearby Cell ID or null.
        // -> a neighboring Cell can be looked up with its ID.
        // -> a null value represents a boundary or edge.
        this.neighbors = {};
        // a "passage" indicates if a neighbor is accessible.
        // "passages" holds direction/passage pairings.
        // each valid direction holds a truthy value here.
        // -> a passage is true, and a boundary is false.
        this.passages = {};
    }
    get hasPath() {
        // each passage's direction has a wall or path.
        // check if there's any passages in the values.
        // a path is represented by true, and a wall is false.
        return Object.values(this.passages).includes(true);
        // `.values()` takes a list of booleans from passages.
        // `.includes()` will see if there are any paths.
    }
    get hasWall() {
        // each passage's direction has a wall or path.
        // check if there's any boundary in the values.
        // a path is represented by true, and a wall is false.
        return Object.values(this.passages).includes(false);
        // `.values()` takes a list of booleans from boundaries.
        // `.includes()` will see if there are any walls.
    }
    get json() {
        // create object for json.
        const jsObject = {
            id: this.id,
            status: this.status,
            neighbors: this.neighbors,
            passages: this.passages,
        };
        return JSON.stringify(jsObject);
    }
}

// multiply is a reducer function.
const multiply = (a, b) => a * b;
// initialize normal directions.
const namedVectors = [
    ['east', 'west'],
    ['south', 'north'],
    ['down', 'up'],
    ['ana', 'kata'],
];
/***********************************************************
This hypercube class can work with different dimensions.
Why a "hypercube"? Because a hypercube is N-Dimensional.
- a 0D point is a type of hypercube.
- a 1D line is a type of hypercube.
- a 2D square is a type of hypercube.
- a 3D cube is a type of hypercube.
- a 4D tesseract is a type of hypercube.
- a ND analogue of these shapes is a type of hypercube.

If each Cell is a box, a 2D HypercubeGraph looks like this:
┌─┬─┬─┐
├─┼─┼─┤
├─┼─┼─┤
└─┴─┴─┘

***********************************************************/
class HypercubeGraph {
    constructor(dimensions) {
        /* CALCULATE MAP INFORMATION */
        // the layout is a hypercube, as defined by this class.
        this.layout = 'hypercube';
        // the `dimensions` represent the lengths of each edge.
        // this includes the width, height, depth, etc.
        this.dimensions = dimensions;
        // the `degree` counts how many dimensions there are.
        // for example, a square has two, and a cube has three.
        this.degree = dimensions.length;
        // just multiply the dimensions together to get `size`.
        // it represents the maximum number of cells to be held.
        //
        // == EDGE CASE ==
        // the value of the nth-dimension is implicitly 1.
        // for example, the 3rd-dimension of [2,3] is 1.
        // it follows that the 1st-dimension of [] is also 1.
        // thus, this function returns 1 if given an empty array.
        //
        // == REASONING ==
        // if any dimension were zero, there would be nothing.
        // zero would be multiplied in places, giving zero back.
        this.size = dimensions.reduce(multiply, 1);
        // The `magnitudes` are how much an index must move as
        // to offset an associated coordinate by exactly one.
        // For example, moving east 1 unit might take 1 index,
        // but moving south 1 unit might take 10 indices.
        this.magnitudes = [];
        // loop through dimensions via each degree `dg`.
        for (let dg = 0; dg < this.degree; dg += 1) {
            // collect antecedent dimensions leading up to here.
            const previous = dimensions.slice(0, dg);
            // calculate the product of those dimensions.
            const product = previous.reduce(multiply, 1);
            // add the product to the list of magnitudes.
            this.magnitudes.push(product);
        }
        /* CALCULATE COMPASS INFORMATION */
        // the `rose` describes the offset in each direction.
        // its extremely useful for computing neighbors.
        this.compass = {};
        // `antipodes` define the opposite of each direction.
        this.antipodes = {};
        // the app gets both from magnitudes.
        for (let dg = 0; dg < this.degree; dg++) {
            // use positive / negative as default key.
            let positive = `pos-${dg}`;
            let negative = `neg-${dg}`;
            // obtain normal direction
            const namedVector = namedVectors[dg];
            if (namedVector !== undefined) {
                [positive, negative] = namedVector;
            }
            // obtain magnitude
            const magnitude = this.magnitudes[dg];
            // assign values to dictionaries via keys.
            this.compass[negative] = -magnitude;
            this.compass[positive] = +magnitude;
            this.antipodes[negative] = positive;
            this.antipodes[positive] = negative;
        }
        // `directions` can help with loops, etc.
        this.directions = new Set(Object.keys(this.compass));
        // set default passages container
        const defaultPassages = {};
        // loop over directions as keys.
        // false is the default value here.
        for (let direction of this.directions) {
            defaultPassages[direction] = false;
        }
        /* FILL MAP DATA */
        // `data` is an array that holds Cells.
        // every Cell themself can also hold information.
        this.data = [];
        // fill map data with empty cells.
        for (let id = 0; id < this.size; id++) {
            // create a new cell using the id from size.
            this.data[id] = new Cell(id);
            // populate neighbors of this cell.
            this.data[id].neighbors = this.findNeighborsOf(id);
            // create a shallow copy of defaultPassages.
            this.data[id].passages = { ...defaultPassages };
        }
    }
    holdsIndex(id) {
        // a valid index has an index in the array.
        return 0 <= id && id < this.size;
    }
    holdsNeighbors(id01, id02) {
        // validate both indices first.
        if (!this.holdsIndex(id01) || !this.holdsIndex(id02)) {
            return false;
        }
        // calculate coordinates.
        const coordinates01 = this.findCoordinates(id01);
        const coordinates02 = this.findCoordinates(id02);
        // count how many times is there an off-by-one match.
        // if these IDs are neighbors, it happens exactly once.
        let counter = 0;
        // loop through each coordinate.
        // all coordinates but one must match.
        // dg is shorthand for the current degree.
        for (let dg = 0; dg < this.degree; dg++) {
            const coordinate01 = coordinates01[dg];
            const coordinate02 = coordinates02[dg];
            // ensure values are not undefined.
            if (coordinate01 === undefined
                || coordinate02 === undefined) {
                return false;
            }
            else {
                // set up difference variable.
                const difference = Math.abs(coordinate01 - coordinate02);
                // check if-gates
                if (difference === 0) ;
                else if (difference === 1) {
                    counter += 1;
                }
                else {
                    return false;
                }
                if (counter > 1) {
                    return false;
                }
            }
            // guarenteed return statement
        }
        if (counter === 1) {
            return true;
        }
        else {
            return false;
        }
    }
    connectPassage(direction, id01, id02) {
        // get instances of cells.
        const cell01 = this.data[id01];
        const cell02 = this.data[id02];
        // `antipode` is the polar opposite of a direction.
        // for example, `antipode` of 'north' is 'south'.
        const antipode = this.antipodes[direction];
        // set passages.
        cell01.passages[direction] = true;
        cell02.passages[antipode] = true;
    }
    connectNeighbor(direction, id01, id02) {
        // get instances of cells.
        const cell01 = this.data[id01];
        const cell02 = this.data[id02];
        // `antipode` is the polar opposite of a direction.
        // for example, `antipode` of 'north' is 'south'.
        const antipode = this.antipodes[direction];
        // set neighbors.
        cell01.neighbors[direction] = id02;
        cell02.neighbors[antipode] = id01;
    }
    findNeighborsOf(id01) {
        // initialize return container.
        const neighbors = {};
        // calculate whether the id exists.
        const exist01 = this.holdsIndex(id01);
        // if id01 does not exist, then return an empty object.
        if (!exist01) {
            return neighbors;
        }
        // set up loop over the keys and values of rose.
        const entries = Object.entries(this.compass);
        for (const [direction, modifier] of entries) {
            // calculate potential neighbor via modifier.
            const id02 = id01 + modifier;
            // ensure both IDs are valid, and add to neighbors.
            if (this.holdsNeighbors(id01, id02)) {
                neighbors[direction] = id02;
                // if they are not, then the neighbor is void.
                // id01 must be a corner- or edge-piece.
            }
            else {
                neighbors[direction] = null;
            }
        }
        // return list of neighbors.
        return neighbors;
    }
    findCoordinates(...indexTensor) {
        // this container will be reduced once populated.
        const containerOfCoordinates = [];
        // loop through all given indices in the tensor.
        for (const id of indexTensor) {
            // set up coordinates array for given index.
            const coordinates = [];
            // loop through each degree.
            // dg is shorthand for the current degree.
            // this maps to an index in dimensions.
            // it also maps to an index in magnitudes.
            for (let dg = 0; dg < this.degree; dg++) {
                // dimensions.length === magnitudes.length;
                // their index associates one with the other.
                const dimension = this.dimensions[dg];
                const magnitude = this.magnitudes[dg];
                // calculate resulting coordinate
                // for this dimension (eg longitude vs latitude)
                // and for this index.
                const coordinate = Math.floor(id / magnitude % dimension);
                // push coordinate into array.
                // remember: these coordinates are only for this id.
                coordinates.push(coordinate);
            }
            // add array of coordinates to array.
            containerOfCoordinates.push(coordinates);
        }
        // create a reducer function that compares
        // the coordinates of two indices.
        // each coordinate is kept if they match.
        // otherwise, they are replaced with undefined.
        const reducer = (xCoords, yCoords) => {
            // zCoords represents the reduced array.
            const zCoords = [];
            // loop through each dimension.
            // remember: the number of dimensions here
            // is equal the degree of the graph.
            // dg is shorthand for the current degree.
            for (let dg = 0; dg < this.degree; dg++) {
                // grab the coordinate of both sets of coordinates.
                const coordinate01 = xCoords[dg];
                const coordinate02 = yCoords[dg];
                // if either coordinate is undefined, its a no-match.
                if (coordinate01 === undefined || coordinate02 === undefined) {
                    zCoords[dg] = undefined;
                    // verify if this dimension's coordinates match.
                }
                else if (coordinate01 === coordinate02) {
                    zCoords[dg] = coordinate01;
                    // otherwise it is definately not a match.
                }
                else {
                    zCoords[dg] = undefined;
                }
            }
            // zCoords represents matching entries between two
            // potentially similar arrays, and their differences.
            // its analogous to an intersection of two sets.
            return zCoords;
        };
        // utilize the reducer function.
        const results = containerOfCoordinates.reduce(reducer);
        // the final zCoords from the reducer explains
        // what coordinates match for every index given.
        // an undefined entry means there is no match there.
        return results;
    }
    findTensorSlice(...coordinates) {
        // slice will be returned once populated.
        const slice = [];
        // this piece creates spacers or iterators.
        // if we have dimensions of [5,4,3] our spacers are:
        // [1,5,20]. The final item = total # of coordinates.
        for (let id = 0; id < this.size; id++) {
            let idIsValid = true;
            // dg is shorthand for the current degree.
            // it maps to indices in dimensions, magnitudes, and coordinates.
            for (let dg = 0; dg < this.degree; dg++) {
                // grab current variables associated with degree.
                const dimension = this.dimensions[dg];
                const magnitude = this.magnitudes[dg];
                const coordinate01 = coordinates[dg];
                // calculate the actual coordinate of the index.
                const coordinate02 = Math.floor(id / magnitude % dimension);
                // a given coordinate of undefined is a wildcard.
                if (coordinate01 === undefined || coordinate02 === undefined) ;
                else if (coordinate01 === coordinate02) ;
                else {
                    idIsValid = false;
                    break;
                }
            }
            // if positive results, add to slice to return later.
            if (idIsValid) {
                slice.push(id);
            }
        }
        // return populated slice container.
        return slice;
    }
    get json() {
        // parse json of each cell, in order of id.
        const stringyCells = [];
        for (const cell of this.data) {
            // add to cells array.
            stringyCells.push(JSON.parse(cell.json));
        }
        // create object for json.
        const jsObject = {
            layout: this.layout,
            dimensions: this.dimensions,
            magnitudes: this.magnitudes,
            degree: this.degree,
            size: this.size,
            compass: this.compass,
            directions: [...this.directions],
            antipodes: this.antipodes,
            data: stringyCells,
        };
        return JSON.stringify(jsObject);
    }
}

var Graph = (dimensions, layout = 'hypercube') => {
    // get the associated typing.
    if (layout === 'hypercube') {
        return new HypercubeGraph(dimensions);
        // } else if (layout === 'trigon') {
        // 	return new TrigonGraph(dimensions)
        // } else if (layout === 'hexagon') {
        // 	return new HexagonGraph(dimensions)
    }
    else {
        return new HypercubeGraph(dimensions);
    }
};

class Stack {
    constructor(...data) {
        this.data = data;
    }
    // get the "height" of the stack, or number of nodes.
    get size() {
        return this.data.length;
    }
    // the stack has nodes if its size is greater than zero.
    get hasNodes() {
        return this.size !== 0;
    }
    // add an node to the "top" of the stack.
    push(node) {
        this.data.push(node);
    }
    // remove a node from the "top" of the stack,
    // and then return it.
    pop() {
        // get the result, which might be undefined.
        const result = this.data.pop();
        // filter out the possibility of returning undefined.
        if (result !== undefined) {
            return result;
        }
        else {
            throw new Error('Cannot pop an empty stack!');
        }
    }
    // return the node at the "top" of the stack,
    // but do not remove it.
    peek() {
        // get the result, which might be undefined.
        const result = this.data.slice(-1)[0];
        // filter out the possibility of returning undefined.
        if (result !== undefined) {
            return result;
        }
        else {
            throw new Error('Cannot peek into an empty stack!');
        }
    }
}

class Queue {
    constructor(...data) {
        this.data = data;
    }
    // get the "length" of the queue, or number of nodes.
    get size() {
        return this.data.length;
    }
    // the queue has nodes if its size is greater than zero.
    get hasNodes() {
        return this.size !== 0;
    }
    // add an node to the "back" of the queue.
    enqueue(node) {
        this.data.push(node);
    }
    // remove an node from the "front" of the queue,
    // and then return it.
    dequeue() {
        // get the result, which might be undefined.
        const result = this.data.shift();
        // filter out the possibility of returning undefined.
        if (result !== undefined) {
            return result;
        }
        else {
            throw new Error('Cannot dequeue an empty queue!');
        }
    }
    // return the node at the "front" of the queue,
    // but do not remove it.
    front() {
        // get the result, which might be undefined.
        const result = this.data[0];
        // filter out the possibility of returning undefined.
        if (result !== undefined) {
            return result;
        }
        else {
            throw new Error('Cannot see front of an empty queue!');
        }
    }
}

// which random function to use as default.
const RANDOM = Math.random;
// random shuffle helper function.
// uses fisher yates randomizer.
const shuffle = (list, items, random = RANDOM) => {
    // create an array-type copy of input list.
    const array = [...list];
    // if the number of items to return was not specified,
    // assume user wants the entire input list shuffled.
    if (items === undefined) {
        items = array.length;
    }
    // store final choices here.
    const results = [];
    // retrieve a number of "items" equal to the given input.
    for (let i = 0; i < items; i++) {
        // choose a random index.
        const choice = Math.floor(random() * array.length);
        // add choice to results.
        results.push(array[choice]);
        // remove choice from the array copy.
        array.splice(choice, 1);
    }
    return results;
};

class IterativeDepthFirst {
    constructor(graph, id00 = 0) {
        // take in the graph.
        this.graph = graph;
        // create a stack to iterate through.
        // this cannot be modified directly.
        // instead, use pop, push, and peek.
        this.stack = new Stack(id00);
    }
    *generator() {
        // loop through stack until it is empty.
        while (this.stack.hasNodes) {
            // peek this number from the stack.
            const id01 = this.stack.peek();
            // identify current cell.
            const cell01 = this.graph.data[id01];
            // mark self as 'active'.
            cell01.status = 'active';
            // await command to continue.
            yield;
            // keep track of whether there are unvisited neighbors.
            let foundUnvisited = false;
            // loop through Cell neighbors in a random order.
            const eligibleDirs = Object.keys(cell01.neighbors);
            const randomDirs = shuffle(eligibleDirs);
            for (const direction of randomDirs) {
                // identify the neighbor cell.
                const id02 = cell01.neighbors[direction];
                // ensure neighbor exists
                if (id02 !== null) {
                    const cell02 = this.graph.data[id02];
                    // check for unvisited neighbors.
                    if (cell02.status === 'unvisited') {
                        // connect the cells
                        this.graph.connectNeighbor(direction, id01, id02);
                        this.graph.connectPassage(direction, id01, id02);
                        // transfer 'active' state to id02.
                        cell01.status = 'passive';
                        // found an unvisited value!
                        foundUnvisited = true;
                        // add unvisited neighbor ID to stack.
                        this.stack.push(id02);
                        // leave loop early since an unvisited was found.
                        break;
                    }
                }
            }
            // check if there were no unvisited neighbors.
            if (!foundUnvisited) {
                // since there were no unvisited neighbors...
                // this cell is unequivically complete!
                cell01.status = 'complete';
                // remove id01 from the stack.
                // id01 is on top, so pop() will remove it.
                this.stack.pop();
            }
        }
        // await command to continue.
        yield;
    }
}

class IterativeBreadthFirst {
    constructor(graph, id00 = 0) {
        // take in the graph.
        this.graph = graph;
        // create a queue to iterate with.
        // this cannot be modified directly.
        // instead, use enqueue, dequeue, and peek.
        this.queue = new Queue(id00);
    }
    *generator() {
        // loop through stack until it is empty.
        while (this.queue.hasNodes) {
            // peek this number from the stack.
            const id01 = this.queue.front();
            // identify current cell.
            const cell01 = this.graph.data[id01];
            // mark self as 'active'.
            cell01.status = 'active';
            // await command to continue.
            yield;
            // keep track of whether there are unvisited neighbors.
            let foundUnvisited = false;
            // loop through Cell neighbors in a random order.
            const eligibleDirs = Object.keys(cell01.neighbors);
            const randomDirs = shuffle(eligibleDirs);
            for (const direction of randomDirs) {
                // identify the neighbor cell.
                const id02 = cell01.neighbors[direction];
                // ensure neighbor exists
                if (id02 !== null) {
                    const cell02 = this.graph.data[id02];
                    // check for unvisited neighbors.
                    if (cell02.status === 'unvisited') {
                        // connect the cells
                        this.graph.connectNeighbor(direction, id01, id02);
                        this.graph.connectPassage(direction, id01, id02);
                        // transfer 'active' state to id02.
                        cell01.status = 'passive';
                        cell02.status = 'active';
                        // await command to continue.
                        yield;
                        // found an unvisited value!
                        foundUnvisited = true;
                        // add unvisited neighbor ID to stack.
                        this.queue.enqueue(id02);
                        // remove active status;
                        // the next ID will become active now.
                        // eventually, id02 will be called upon again.
                        cell02.status = 'passive';
                        // leave loop early since an unvisited was found.
                        break;
                    }
                }
            }
            // check if there were no unvisited neighbors.
            if (!foundUnvisited) {
                // since there were no unvisited neighbors...
                // this cell is unequivically complete!
                cell01.status = 'complete';
                // remove id01 from the stack.
                // id01 is on top, so pop() will remove it.
                this.queue.dequeue();
            }
        }
        // await command to continue.
        yield;
    }
}

var Maze = (dimensions, layout = 'hypercube', algorithm = 'iterative depth-first traversal') => {
    // initialize graph object
    const graph = Graph(dimensions, layout);
    // get the associated typing.
    if (algorithm === 'iterative depth-first traversal') {
        return new IterativeDepthFirst(graph);
    }
    else if (algorithm === 'iterative breadth-first traversal') {
        return new IterativeBreadthFirst(graph);
    }
    else {
        return new IterativeDepthFirst(graph);
    }
};
/*
    def shortest_path_bfs(self, paths=None, A=None, B=None):
        '''
        A = given starting node
        B = given finishing node
        C = arbitrary iterated node
        a_list = traversed list of nodes
        b_list = traversed list of nodes
        c_list = traversed list of nodes
        queue:
        visited: set of visited vertices
        vertices: every single vertex in the graph
        '''
        # set up default parameters.
        if A is None or B is None:
            # a_loc = random.randint(0, 0)
            # b_loc = random.randint(0, len(self.maze) - 1)
            a_loc = 0
            b_loc = len(self.maze) - 1
            print('find', b_loc)
            A = self.maze[a_loc]
            B = self.maze[b_loc]
        # create vertex queue, and start with vertex A.
        queue = [[A]]  # HACK not a real queue.
        # create visited set, and start with vertex A.
        visited = {A}

        while queue != []:
            # dequeue first vertex.
            # HACK change later for non-array.
            a_list = queue.pop()
            A = a_list[-1]
            # check a condition.
            if A == B:
                print(len(a_list), 'steps')
                return a_list
            # add its neighbors to the queue.
            for compass in A.neighbors:
                # get vertex from compass.
                C = A.neighbors[compass]
                # pass if neighbor does not exist.
                if C is None or C is False:
                    pass
                # pass if neighbor has been visited already.
                elif C in visited:
                    pass
                else:
                    # visit the vertex.
                    visited.add(C)
                    # HACK change later for non-array.
                    c_list = a_list[:]
                    c_list.append(C)
                    queue.insert(0, c_list)
        return paths

    def aerate_maze(self, n=1):
        '''
        deletes n random walls to destroy trees.
        this could make a maze easier or harder.
        '''
        # this will allow us to iterate through blocks.
        # we want to find a block with a blocked neighbor.
        unvisited = list(range(0, len(self.maze)))
        random.shuffle(unvisited)

        # loop through until its found
        block_id = None
        block = None
        found = False
        while not found:
            # pick out a random block.
            block_id = unvisited.pop()
            block = self.maze[block_id]
            # check its neighbors.
            for compass in block.neighbors:
                neighbor = block.neighbors[compass]
                # see if it has a blocked off neighbor.
                if block.neighbors[compass] is False:
                    found = True

        # randomize compass order.
        random_neighbors = list(block.neighbors.items())
        random.shuffle(random_neighbors)

        # neighbors
        sibling_id = None
        sibling = None

        # check its compass neighbors.
        for compass, neighbor in random_neighbors:
            if neighbor is False:
                if compass == 'north':
                    sibling_id = block_id - self.length
                elif compass == 'south':
                    sibling_id = block_id + self.length
                elif compass == 'east':
                    sibling_id = block_id + 1
                elif compass == 'west':
                    sibling_id = block_id - 1
                sibling = self.maze[sibling_id]
                break

        # this is useful for doubly-linked vertices.
        reverse_compass = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east',
        }

        # reverse reverses compass, a cardinal direction.
        reverse = reverse_compass[compass]

        # finally set the new connection!
        block.neighbors[compass] = sibling
        sibling.neighbors[reverse] = block

        # keep going if n is more than 1.
        n -= 1
        if n > 0:
            self.aerate_maze(n)
*/

export default Maze;
