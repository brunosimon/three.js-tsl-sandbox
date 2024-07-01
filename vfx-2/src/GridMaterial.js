import { If, min, MeshBasicNodeMaterial, SpriteNodeMaterial, color, range, sin, instanceIndex, timerDelta, smoothstep, step, timerGlobal, tslFn, uniform, uv, vec3, vec4, positionWorld, vec2, normalWorld, mix, max, rangeFog, densityFog } from 'three/examples/jsm/nodes/Nodes.js'

const projectedGridUv = tslFn(([ position, normal ]) =>
{
    const dotX = normal.dot(vec3(1, 0, 0)).abs()
    const dotY = normal.dot(vec3(0, 1, 0)).abs()
    const dotZ = normal.dot(vec3(0, 0, 1)).abs()

    const uvX = position.yz.toVar()
    const uvY = position.xz.toVar()
    const uvZ = position.xy.toVar()

    const uv = uvX

    If(dotZ.greaterThan(dotX), () =>
    {
        uv.assign(uvZ)
    })
    If(dotY.greaterThan(dotX).and(dotY.greaterThan(dotZ)), () =>
    {
        uv.assign(uvY)
    })

    return uv
})

const projectedGrid = tslFn(([scale, thickness, offset]) =>
{
    const uv = projectedGridUv(positionWorld, normalWorld).div(scale).add(thickness.mul(0.5)).add(offset).mod(1)
    return max(
        uv.x.step(thickness),
        uv.y.step(thickness)
    )
})

const scaleUniform = uniform(0.1)
const thicknessUniform = uniform(0.1)
const offsetUniform = uniform(vec2(0, 0))
const colorBackUniform = uniform(color('#19191f'))
const colorSmallUniform = uniform(color('#39364f'))
const colorBigUniform = uniform(color('#705df2'))

let finalColor = mix(
    colorBackUniform,
    colorSmallUniform,
    projectedGrid(scaleUniform, thicknessUniform, offsetUniform)
)
finalColor = mix(
    finalColor,
    colorBigUniform,
    projectedGrid(scaleUniform.mul(10), thicknessUniform.div(10), offsetUniform)
)

const gridMaterial = new MeshBasicNodeMaterial()
gridMaterial.colorNode = vec4(finalColor, 1)

// gui.add(scaleUniform, 'value', 0, 0.2, 0.001).name('scale')
// gui.add(thicknessUniform, 'value', 0, 1, 0.001).name('thickness')
// gui.add(offsetUniform.value, 'x', 0, 1, 0.001).name('offsetX')
// gui.add(offsetUniform.value, 'y', 0, 1, 0.001).name('offsetY')
// gui.addColor({ color: colorBackUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorBackUniform.value.set(value) }).name('colorBack')
// gui.addColor({ color: colorSmallUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorSmallUniform.value.set(value) }).name('colorSmall')
// gui.addColor({ color: colorBigUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorBigUniform.value.set(value) }).name('colorBig')

export default gridMaterial