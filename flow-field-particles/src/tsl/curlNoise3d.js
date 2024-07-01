// Base on https://al-ro.github.io/projects/embers/
import { EPSILON, cross, tslFn, vec3 } from "three/examples/jsm/nodes/Nodes.js"
import { simplexNoise3d } from './simplexNoise3d.js'

const curlNoise3d = tslFn(([ inputA ]) =>
{
    // X
    const aXPos = simplexNoise3d(inputA.add(vec3(EPSILON, 0, 0)))
    const aXNeg = simplexNoise3d(inputA.sub(vec3(EPSILON, 0, 0)))
    const aXAverage = aXPos.sub(aXNeg).div(EPSILON.mul(2))

    // Y
    const aYPos = simplexNoise3d(inputA.add(vec3(0, EPSILON, 0)))
    const aYNeg = simplexNoise3d(inputA.sub(vec3(0, EPSILON, 0)))
    const aYAverage = aYPos.sub(aYNeg).div(EPSILON.mul(2))

    // Z
    const aZPos = simplexNoise3d(inputA.add(vec3(0, 0, EPSILON)))
    const aZNeg = simplexNoise3d(inputA.sub(vec3(0, 0, EPSILON)))
    const aZAverage = aZPos.sub(aZNeg).div(EPSILON.mul(2))

    const aGrabNoise = vec3(aXAverage, aYAverage, aZAverage).normalize()

    // Offset position for second noise read
    const inputB = inputA.add(3.5) // Because breaks the simplex noise 10000.5

    // X
    const bXPos = simplexNoise3d(inputB.add(vec3(EPSILON, 0, 0)))
    const bXNeg = simplexNoise3d(inputB.sub(vec3(EPSILON, 0, 0)))
    const bXAverage = bXPos.sub(bXNeg).div(EPSILON.mul(2))

    // Y
    const bYPos = simplexNoise3d(inputB.add(vec3(0, EPSILON, 0)))
    const bYNeg = simplexNoise3d(inputB.sub(vec3(0, EPSILON, 0)))
    const bYAverage = bYPos.sub(bYNeg).div(EPSILON.mul(2))

    // Z
    const bZPos = simplexNoise3d(inputB.add(vec3(0, 0, EPSILON)))
    const bZNeg = simplexNoise3d(inputB.sub(vec3(0, 0, EPSILON)))
    const bZAverage = bZPos.sub(bZNeg).div(EPSILON.mul(2))

    const bGrabNoise = vec3(bXAverage, bYAverage, bZAverage).normalize()

    return cross(aGrabNoise, bGrabNoise).normalize()
})

curlNoise3d.setLayout( {
    name: 'curlNoise3d',
    type: 'vec3',
    inputs: [
        { name: 'input', type: 'vec3' }
    ]
} )

export { curlNoise3d }