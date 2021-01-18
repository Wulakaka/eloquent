import VillageState from './models/villageState'
import roadGraph from './data/roadGraph'

/**
 * 启动robot
 * @param state
 * @param robot
 * @param memory
 */
function runRobot (state, robot, memory) {
  for (let turn = 0; ; turn++) {
    if (state.parcels.length === 0) {
      console.log(`Done in ${turn} turns`)
      break
    }
    const action = robot(state, memory)
    state = state.move(action.direction)
    memory = action.memory
    console.log(`Moved to ${action.direction}`)
  }
}

function randomPick (array) {
  const choice = Math.floor(Math.random() * array.length)
  return array[choice]
}

/**
 * 获取一个前往任意方向的robot
 * @param state
 * @returns {{direction}}
 */
function randomRobot (state) {
  return {
    direction: randomPick(roadGraph[state.place])
  }
}

/**
 * 生成一个包含默认5个包裹，位置为Post Office的状态
 * @param parcelCount
 * @returns {VillageState}
 */
VillageState.random = function (parcelCount = 5) {
  const parcels = []
  for (let i = 0; i < parcelCount; i++) {
    const address = randomPick(Object.keys(roadGraph))
    let place
    do {
      place = randomPick(Object.keys(roadGraph))
    } while (place == address)
    parcels.push({ place, address })
  }
  return new VillageState('Post Office', parcels)
}

const mailRoute = [
  "Alice's House", 'Cabin', "Alice's House", "Bob's House",
  'Town Hall', "Daria's House", "Ernie's House",
  "Grete's House", 'Shop', "Grete's House", 'Farm',
  'Marketplace', 'Post Office'
]

/**
 * 规定路径的robot
 * @param state
 * @param memory
 * @returns {{memory: string[], direction: string}}
 */
function routeRobot (state, memory) {
  if (memory.length == 0) {
    memory = mailRoute
  }
  return {
    direction: memory[0],
    memory: memory.slice(1)
  }
}

/**
 *
 * @param graph - 图
 * @param from - 起点
 * @param to - 终点
 * @returns {*[]}
 */
function findRoute (graph, from, to) {
  // 搜索过的点
  const work = [
    {
      at: from,
      route: []
    }
  ]
  for (let i = 0; i < work.length; i++) {
    // 获取当前地点
    const { at, route } = work[i]
    // 遍历当前地点的相邻地点
    for (const place of graph[at]) {
      // 如果当前相邻地点为目标地点，路径中增加当前点，跳出循环
      if (place === to) return route.concat(place)
      // 如果当前相邻地点不是目标地点，
      // 如果当前相邻地点未被搜索过，增加待搜索的点
      if (!work.some(w => w.at === place)) {
        work.push({
          at: place,
          route: route.concat(place)
        })
      }
    }
  }
}

/**
 * 有方向的robot
 * @param place
 * @param parcels
 * @param route
 * @returns {{memory: *[], direction: *}}
 */
function goalOrientedRobot ({ place, parcels }, route) {
  if (route.length === 0) {
    const parcel = parcels[0]
    if (parcel.place !== place) {
      route = findRoute(roadGraph, place, parcel.place)
    } else {
      route = findRoute(roadGraph, place, parcel.address)
    }
  }
  return {
    direction: route[0],
    memory: route.slice(1)
  }
}

const state = VillageState.random()

function countSteps (state, robot, memory) {
  for (let steps = 0; ; steps++) {
    if (state.parcels.length === 0) return steps
    const action = robot(state, memory)
    state = state.move(action.direction)
    memory = action.memory
  }
}

function compareRobots (robot1, memory1, robot2, memory2) {
  let total1 = 0; let total2 = 0
  for (let i = 0; i < 100; i++) {
    const state = VillageState.random()
    total1 += countSteps(state, robot1, memory1)
    total2 += countSteps(state, robot2, memory2)
  }
  console.log(`Robot 1 needed ${total1 / 100} steps per task`)
  console.log(`Robot 2 needed ${total2 / 100}`)
}
compareRobots(lazyRobot, [], goalOrientedRobot, [])

function lazyRobot ({ place, parcels }, route) {
  if (route.length == 0) {
    // Describe a route for every parcel
    const routes = parcels.map(parcel => {
      // 如果包裹地点为当前地点，则计算陪送位置的最短距离；如果不是，计算拾取的最短距离
      if (parcel.place != place) {
        return {
          route: findRoute(roadGraph, place, parcel.place),
          pickUp: true
        }
      } else {
        return {
          route: findRoute(roadGraph, place, parcel.address),
          pickUp: false
        }
      }
    })

    // This determines the precedence a route gets when choosing.
    // 这将决定选择路由的优先级
    // Route length counts negatively, routes that pick up a package
    // get a small bonus.
    // 路线长度以负数计数，拾取包的路线会获得一个小的奖金。
    // 0.5 只是一个小标记，0-1之间都可以
    function score ({ route, pickUp }) {
      return (pickUp ? 0.5 : 0) - route.length
    }
    route = routes.reduce((a, b) => score(a) > score(b) ? a : b).route
  }

  return { direction: route[0], memory: route.slice(1) }
}

runRobot(state, lazyRobot, [])
