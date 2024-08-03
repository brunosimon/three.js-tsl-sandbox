// Base on https://al-ro.github.io/projects/embers/
// Added a 4th dimension

import { EPSILON, cross, tslFn, vec3, vec4 } from "three/webgpu"
import { simplexNoise4d } from './simplexNoise4d.js'

const curlNoise4d = tslFn(([ inputA ]) =>
{
    // X
    const aXPos = simplexNoise4d(inputA.add(vec4(EPSILON, 0, 0, 0)))
    const aXNeg = simplexNoise4d(inputA.sub(vec4(EPSILON, 0, 0, 0)))
    const aXAverage = aXPos.sub(aXNeg).div(EPSILON.mul(2))

    // Y
    const aYPos = simplexNoise4d(inputA.add(vec4(0, EPSILON, 0, 0)))
    const aYNeg = simplexNoise4d(inputA.sub(vec4(0, EPSILON, 0, 0)))
    const aYAverage = aYPos.sub(aYNeg).div(EPSILON.mul(2))

    // Z
    const aZPos = simplexNoise4d(inputA.add(vec4(0, 0, EPSILON, 0)))
    const aZNeg = simplexNoise4d(inputA.sub(vec4(0, 0, EPSILON, 0)))
    const aZAverage = aZPos.sub(aZNeg).div(EPSILON.mul(2))

    const aGrabNoise = vec3(aXAverage, aYAverage, aZAverage).normalize()

    // Second noise read
    const inputB = inputA.add(3.5) // Because 10000.5 breaks the simplex noise

    // X
    const bXPos = simplexNoise4d(inputB.add(vec4(EPSILON, 0, 0, 0)))
    const bXNeg = simplexNoise4d(inputB.sub(vec4(EPSILON, 0, 0, 0)))
    const bXAverage = bXPos.sub(bXNeg).div(EPSILON.mul(2))

    // Y
    const bYPos = simplexNoise4d(inputB.add(vec4(0, EPSILON, 0, 0)))
    const bYNeg = simplexNoise4d(inputB.sub(vec4(0, EPSILON, 0, 0)))
    const bYAverage = bYPos.sub(bYNeg).div(EPSILON.mul(2))

    // Z
    const bZPos = simplexNoise4d(inputB.add(vec4(0, 0, EPSILON, 0)))
    const bZNeg = simplexNoise4d(inputB.sub(vec4(0, 0, EPSILON, 0)))
    const bZAverage = bZPos.sub(bZNeg).div(EPSILON.mul(2))

    const bGrabNoise = vec3(bXAverage, bYAverage, bZAverage).normalize()

    return cross(aGrabNoise, bGrabNoise).normalize()
})

curlNoise4d.setLayout( {
    name: 'curlNoise4d',
    type: 'vec3',
    inputs: [
        { name: 'input', type: 'vec4' }
    ]
} )

export { curlNoise4d }