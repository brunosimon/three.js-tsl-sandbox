import GUI from 'lil-gui'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { cos, positionGeometry, float, min, timerLocal, atan2, uniform, pass, bloom, PI, PI2, color, dot, mix, positionLocal, rangeFog, sin, step, texture, tslFn, uv, vec2, vec3, vec4 } from 'three/webgpu'
import gridMaterial from './GridMaterial'

/**
 * Base
 */
// Debug
const debugObject = {}
const gui = new GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.fogNode = rangeFog(color('#171617'), 2, 15)

// Loaders
const textureLoader = new THREE.TextureLoader()

// Texture
const cellularTexture = textureLoader.load('./Voronoi 1 - 256x256.png')
const perlinTexture = textureLoader.load('./perlinTexture.png')
perlinTexture.wrapS = THREE.RepeatWrapping
perlinTexture.wrapT = THREE.RepeatWrapping

const uvCheckerTexture = textureLoader.load('./uvCheckerByValle.jpg')
uvCheckerTexture.colorSpace = THREE.SRGBColorSpace
uvCheckerTexture.wrapS = THREE.RepeatWrapping
uvCheckerTexture.wrapT = THREE.RepeatWrapping

/**
 * TSL functions
 */
const toRadialUv = tslFn(([uv, multiplier, rotation, offset]) => 
{
    const centeredUv = uv.sub(0.5).toVar();
    const distanceToCenter = centeredUv.length()
    const angle = atan2(centeredUv.y, centeredUv.x);
    const radialUv = vec2(angle.add(PI).div(PI2), distanceToCenter).toVar()
    radialUv.mulAssign(multiplier)
    radialUv.x.addAssign(rotation)
    radialUv.y.addAssign(offset)

    return radialUv
})

const toSkewedUv = tslFn(([uv, skew]) =>
{
    return vec2(
        uv.x.add(uv.y.mul(skew.x)),
        uv.y.add(uv.x.mul(skew.y))
    )
})

/**
 * Tornado floor
 */

// Material
const floorMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, wireframe: true })
const emissiveColor = uniform(color('#f4a980'))

// // Output
// floorMaterial.outputNode = tslFn(() =>
// {
//     const time = timerLocal(0.5)

//     // Noise 1
//     const noise1Uv = toRadialUv(
//         uv(),
//         vec2(0.5, 0.5),
//         time,
//         time.negate()
//     )
//     noise1Uv.assign(toSkewedUv(
//         noise1Uv,
//         vec2(1, 0)
//     ))
//     noise1Uv.mulAssign(vec2(4, 1))
//     const noise1 = texture(perlinTexture, noise1Uv, 1).r.remap(0.45, 0.7)

//     // Noise 2
//     const noise2Uv = toRadialUv(
//         uv(),
//         vec2(2, 8),
//         time.mul(2),
//         time.mul(8).negate()
//     )
//     noise2Uv.assign(toSkewedUv(
//         noise2Uv,
//         vec2(0.25, 0)
//     ))
//     noise2Uv.mulAssign(vec2(2, 0.25))
//     const noise2 = texture(perlinTexture, noise2Uv, 1).b.remap(0.45, 0.7)

//     // Fade out
//     const distanceToCenter = uv().sub(0.5).toVar()
//     const fadeOut = min(
//         distanceToCenter.length().smoothstep(0.5, 0.1),
//         distanceToCenter.length().smoothstep(0, 0.2)
//     )
//     // const fadeOut = distanceToCenter.length().smoothstep(0, 0.2)

//     // Combine
//     const effect = noise1.mul(noise2)
//     effect.mulAssign(fadeOut)

//     // Alpha
//     const alpha = effect.smoothstep(0, 0.01)

//     // Diffuse
//     const diffuse = emissiveColor.mul(float(0.2).step(effect)).mul(3)

//     const uvCheck = texture(uvCheckerTexture, noise2Uv, 1)
//     return vec4(vec3(diffuse), alpha)
//     // return vec4(vec3(noise2), 1)
// })()

// Geometry
const floorGeometry = new THREE.PlaneGeometry(1, 1, 1, 1)

// Mesh
const floor = new THREE.Mesh(floorGeometry, floorMaterial)
floor.scale.setScalar(2)
floor.position.y = 0.01
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Layer 1
 */
 
// Material
const layer1Material = new THREE.MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide, wireframe: true })

// // Output
// layer1Material.outputNode = tslFn(() =>
// {
//     const time = timerLocal(0.5)

//     // Noise 1
//     const noise1Uv = uv().add(vec2(time, time.negate())).toVar()
//     noise1Uv.assign(toSkewedUv(
//         noise1Uv,
//         vec2(-1, 0)
//     ))
//     noise1Uv.mulAssign(vec2(2, 0.25))
//     const noise1 = texture(perlinTexture, noise1Uv, 1).r.remap(0.45, 0.7)

//     // Noise 2
//     const noise2Uv = uv().add(vec2(time.mul(0.5), time.negate())).toVar()
//     noise2Uv.assign(toSkewedUv(
//         noise2Uv,
//         vec2(-1, 0)
//     ))
//     noise2Uv.mulAssign(vec2(5, 1))
//     const noise2 = texture(perlinTexture, noise2Uv, 1).r.remap(0.45, 0.7)

//     // Fade out
//     const fadeOut = min(
//         uv().y.smoothstep(0, 0.1),
//         uv().y.smoothstep(1, 0.6)
//     )

//     // Combine
//     const effect = noise1.mul(noise2)
//     effect.mulAssign(fadeOut)

//     // Alpha
//     const alpha = effect.smoothstep(0, 0.1)

//     // Diffuse
//     const diffuse = emissiveColor.mul(float(0.2).step(effect)).mul(3)

//     const uvCheck = texture(uvCheckerTexture, noise2Uv, 1)
//     return vec4(emissiveColor.mul(3), alpha)
//     // return vec4(vec3(fadeOut), 1)
// })()

layer1Material.positionNode = tslFn(() =>
{
    const time = timerLocal()
    const angle = atan2(positionLocal.z, positionLocal.x)
    const elevation = positionLocal.y

    // Parabol
    const a = float(1)
    const b = float(- 0.3)
    const c = float(0.2)
    const radius = a.mul(positionLocal.y.add(b)).pow(2).add(c).sub(0.1)

    // Turbulences
    const turbulence = sin(elevation.sub(time).mul(20).add(angle.mul(2))).mul(0.05)
    radius.addAssign(turbulence)

    const newPosition = vec3(
        cos(angle).mul(radius),
        elevation,
        sin(angle).mul(radius)
    )

    return newPosition
})()

// Geometry
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 64, 64, true)
cylinderGeometry.translate(0, 0.5, 0)

// Mesh
const layer1 = new THREE.Mesh(cylinderGeometry, layer1Material)
layer1.scale.set(1, 1, 1)
scene.add(layer1)

/**
 * Layer 2
 */
 
// Material
const layer2Material = new THREE.MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide, wireframe: true })

// // Output
// layer2Material.outputNode = tslFn(() =>
// {
//     const time = timerLocal(0.5).add(123.4)

//     // Noise 1
//     const noise1Uv = uv().add(vec2(time, time.negate())).toVar()
//     noise1Uv.assign(toSkewedUv(
//         noise1Uv,
//         vec2(-1, 0)
//     ))
//     noise1Uv.mulAssign(vec2(2, 0.25))
//     const noise1 = texture(perlinTexture, noise1Uv, 1).r.remap(0.45, 0.7)

//     // Noise 2
//     const noise2Uv = uv().add(vec2(time.mul(0.5), time.negate())).toVar()
//     noise2Uv.assign(toSkewedUv(
//         noise2Uv,
//         vec2(-1, 0)
//     ))
//     noise2Uv.mulAssign(vec2(5, 1))
//     const noise2 = texture(perlinTexture, noise2Uv, 1).r.remap(0.45, 0.7)

//     // Fade out
//     const fadeOut = min(
//         uv().y.smoothstep(0, 0.2),
//         uv().y.smoothstep(1, 0.6)
//     )

//     // Combine
//     const effect = noise1.mul(noise2)
//     effect.mulAssign(fadeOut)

//     // Alpha
//     const alpha = effect.smoothstep(0, 0.01)

//     const uvCheck = texture(uvCheckerTexture, noise2Uv, 1)
//     return vec4(vec3(0), alpha)
//     // return vec4(vec3(fadeOut), 1)
// })()

layer2Material.positionNode = tslFn(() =>
{
    const time = timerLocal()
    const angle = atan2(positionLocal.z, positionLocal.x)
    const elevation = positionLocal.y

    // Parabol
    const a = float(1)
    const b = float(- 0.3)
    const c = float(0.2)
    const radius = a.mul(positionLocal.y.add(b)).pow(2).add(c)

    // Turbulences
    const turbulence = sin(elevation.sub(time).mul(20).add(angle.mul(2))).mul(0.05)
    radius.addAssign(turbulence)

    const newPosition = vec3(
        cos(angle).mul(radius),
        elevation,
        sin(angle).mul(radius)
    )

    return newPosition
})()

// Mesh
const layer2 = new THREE.Mesh(cylinderGeometry, layer2Material)
layer2.scale.set(1, 1, 1)
scene.add(layer2)

/**
 * Debug
 */

gui.addColor({ color: emissiveColor.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange(value => emissiveColor.value.set(value)).name('emissiveColor')

/**
 * Grid
 */
const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    gridMaterial
)
grid.rotation.x = - Math.PI * 0.5
grid.position.y = 0
scene.add(grid)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.y = 0.4
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#171617')

debugObject.clearColor = '#171617'
renderer.setClearColor(debugObject.clearColor)
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() =>
    {
        renderer.setClearColor(debugObject.clearColor)
    })

/**
 * Renderer
 */
const postProcessing = new THREE.PostProcessing(renderer)

const scenePass = pass(scene, camera)
const scenePassColor = scenePass.getTextureNode('output')

const bloomPass = bloom(scenePassColor, 1, 0.1, 1)

const bloomGui = gui.addFolder('bloom')
bloomGui.add(bloomPass.strength, 'value', 0, 10, 0.01).name('strength')
bloomGui.add(bloomPass.radius, 'value', 0, 1, 0.01).name('radius')
bloomGui.add(bloomPass.threshold, 'value', 0, 1, 0.01).name('threshold')

postProcessing.outputNode = scenePassColor.add(bloomPass)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    postProcessing.renderAsync()
    // renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()