import GUI from 'lil-gui'
import * as THREE from 'three'
import { color, uniform, rangeFog } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import MeshGridMaterial, { MeshGridMaterialLine } from './MeshGridMaterial.js'

/**
 * Base
 */
// Debug
const gui = new GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
const fogColor = uniform(color('#1b191f'))
const fogNode = rangeFog(fogColor, 20, 50)
scene.fogNode = fogNode

gui.add({ fog: true }, 'fog').onChange(value =>
{
    if(value)
        scene.fogNode = fogNode
    else
        scene.fogNode = null
})

// Loaders
const gltfLoader = new GLTFLoader()

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
renderer.setClearColor(fogColor.value)

// Background color debug

gui
    .addColor({ color: fogColor.value.getHexString(THREE.SRGBColorSpace) }, 'color')
    .name('backgroundColor')
    .onChange(value =>
    {
        renderer.setClearColor(value)
        fogColor.value.set(value)
        worldGridMaterial.color.set(value)
        uvGridMaterial.color.set(value)
    })

/**
 * Material
 */
const lines = [
    new MeshGridMaterialLine('#444444', 0.1, 0.04, 0.25),
    new MeshGridMaterialLine('#705df2', 1, 0.02, 0.75),
    new MeshGridMaterialLine('#ffffff', 10, 0.002),
]

const worldGridMaterial = new MeshGridMaterial({
    color: '#19191f',
    scale: 1,
    antialiased: true,
    reference: 'worldTriplanar',
    side: THREE.DoubleSide,
    lines
})

const uvGridMaterial = new MeshGridMaterial({
    color: '#19191f',
    scale: 0.1,
    antialiased: true,
    reference: 'uv', // uv | world
    side: THREE.DoubleSide,
    lines
})

// Debug

const gridFolder = gui.addFolder('grid')
gridFolder.add(worldGridMaterial, 'scale', 0, 10, 0.001).name('scale')
gridFolder.add({ antialiased: worldGridMaterial.antialiased }, 'antialiased').onChange(value =>
{
    worldGridMaterial.antialiased = value
    uvGridMaterial.antialiased = value

    worldGridMaterial.needsUpdate = true
    uvGridMaterial.needsUpdate = true
})

for(const line of worldGridMaterial.lines)
{
    const lineGui = gridFolder.addFolder('line')
    lineGui.add(line.scale, 'value', 0, 10, 0.001).name('scale')
    lineGui.add(line.thickness, 'value', 0, 1, 0.001).name('thickness')
    lineGui.add(line.offset.value, 'x', 0, 1, 0.001).name('offsetX')
    lineGui.add(line.offset.value, 'y', 0, 1, 0.001).name('offsetY')
    lineGui.add(line.cross, 'value', 0, 1, 0.001).name('cross')
    lineGui.addColor({ color: line.color.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { line.color.value.set(value) }).name('colorBack')
}

/**
 * Objects
 */
// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    worldGridMaterial
)
floor.rotation.x = - Math.PI * 0.5
floor.position.y = - 1
scene.add(floor)

// Torus knot
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    uvGridMaterial
)
plane.position.x = - 3
scene.add(plane)

// Sphere
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    worldGridMaterial
)
sphere.position.x = 3
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
                child.material = worldGridMaterial
        })
        scene.add(suzanne)
    }
)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Update objects
    if(suzanne)
    {
        plane.rotation.x = elapsedTime * 0.5
        suzanne.rotation.x = elapsedTime * 0.5

        plane.rotation.y = elapsedTime * 0.3
        suzanne.rotation.y = elapsedTime * 0.3

        sphere.position.y = Math.sin(elapsedTime)
    }

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()