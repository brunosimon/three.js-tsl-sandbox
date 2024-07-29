import * as THREE from 'three/webgpu'
import { color, mix, normalWorld, output, tslFn, uniform, vec4, viewportCoordinate, viewportResolution } from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import GUI from 'lil-gui'

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

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Material
 */
const material = new THREE.MeshStandardNodeMaterial({ color: '#ff822e' })
gui.addColor({ color: material.color.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { material.color.set(value) })

// Setup
const halftonesSettings = [
    {
        count: 140,
        color: '#690099',
        phi: 2.75,
        theta: -0.4,
        edgeStart: 1,
        edgeEnd: -0.5,
        alphaStart: 1,
        alphaEnd: 0.25,
        maxRadius: 0.8
    },
    {
        count: 120,
        color: '#94ffd1',
        phi: 0.75,
        theta: 2.2,
        edgeStart: 1,
        edgeEnd: -1,
        alphaStart: 1,
        alphaEnd: 0,
        maxRadius: 0.9
    }
]

// Halftone
const getHalftoned = tslFn(([count, color, direction, edgeStart, edgeEnd, maxRadius, alphaStart, alphaEnd]) =>
{
    // Grid UV
    let gridUv = viewportCoordinate.xy.div(viewportResolution.yy).mul(count)
    gridUv = gridUv.rotate(Math.PI * 0.25).mod(1)

    // Effect strength
    const strength = normalWorld.dot(direction.normalize()).remapClamp(-1, 1, edgeEnd, edgeStart)

    // Dot
    const dot = gridUv.sub(0.5).length().step(strength.mul(maxRadius).mul(0.5))
    dot.mulAssign(mix(alphaEnd, alphaStart, strength))

    return vec4(color, dot)
})

// Output
material.outputNode = tslFn(() =>
{
    let finalOutput = output

    for(const index in halftonesSettings)
    {
        const settings = halftonesSettings[index]

        // Uniforms
        const count = uniform(settings.count)
        const color_ = uniform(color(settings.color))

        const spherical = new THREE.Spherical(1, settings.phi, settings.theta)
        const direction = uniform(new THREE.Vector3().setFromSpherical(spherical))

        const edgeStart = uniform(settings.edgeStart)
        const edgeEnd = uniform(settings.edgeEnd)
        const alphaStart = uniform(settings.alphaStart)
        const alphaEnd = uniform(settings.alphaEnd)
        const maxRadius = uniform(settings.maxRadius)

        // Debug UI
        const folder = gui.addFolder(`⚪️ Halftone ${index}`)

        folder.addColor({ color: color_.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { color_.value.set(value) })
        folder.add(count, 'value', 1, 200, 1).name('count')

        folder.add(spherical, 'phi', 0, Math.PI).onChange(() => { direction.value.setFromSpherical(spherical) }).name('phi')
        folder.add(spherical, 'theta', -Math.PI, Math.PI).onChange(() => { direction.value.setFromSpherical(spherical) }).name('theta')

        folder.add(edgeStart, 'value', -1, 1, 0.01).name('edgeStart')
        folder.add(edgeEnd, 'value', -1, 1, 0.01).name('edgeEnd')
        folder.add(alphaStart, 'value', 0, 1, 0.01).name('alphaStart')
        folder.add(alphaEnd, 'value', 0, 1, 0.01).name('alphaEnd')
        folder.add(maxRadius, 'value', 0, 1, 0.01).name('maxRadius')

        // Add to output
        const halfTone = getHalftoned(count, color_, direction, edgeStart, edgeEnd, maxRadius, alphaStart, alphaEnd)
        finalOutput.rgb.assign(mix(finalOutput.rgb, halfTone.rgb, halfTone.a))
    }

    return finalOutput
})()

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#ffffff', 3)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(4, 3, 1)
scene.add(directionalLight)

const lightsFolder = gui.addFolder('💡 Lights')
lightsFolder.add(ambientLight, 'intensity', 0, 10, 0.001).name('ambientIntensity')
lightsFolder.add(directionalLight, 'intensity', 0, 10, 0.001).name('directionalIntensity')

/**
 * Objects
 */
// Torus knot
const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
    material
)
torusKnot.position.x = 3
scene.add(torusKnot)

// Sphere
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    material
)
sphere.position.x = - 3
scene.add(sphere)

// Suzanne
let suzanne = null
gltfLoader.load(
    './suzanne.glb',
    (gltf) =>
    {
        suzanne = gltf.scene
        suzanne.traverse((child) =>
        {
            if(child.isMesh)
                child.material = material
        })
        scene.add(suzanne)
    }
)

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
camera.position.x = 6
camera.position.y = 3
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
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

debugObject.clearColor = '#231726'
renderer.setClearColor(debugObject.clearColor)
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() =>
    {
        renderer.setClearColor(debugObject.clearColor)
    })

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
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()