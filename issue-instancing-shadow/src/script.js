import GUI from 'lil-gui'
import * as THREE from 'three/webgpu'
import { sin, positionLocal, time, vec2, vec3, vec4, uv, uniform, color, fog, rangeFogFactor, pass, renderOutput, Fn, instanceIndex, float, instance } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { sobel } from 'three/addons/tsl/display/SobelOperatorNode.js';

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
    forceWebGL: false
})
renderer.shadowMap.enabled = true
// renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000)

/**
 * Instances
 * We want to move the instances up (world coordinates) in the positionNode
 */
{
    const count = 10

    const geometry = new THREE.ConeGeometry(0.1, 0.2, 10)

    const material = new THREE.MeshStandardNodeMaterial()
    material.positionNode = Fn(() =>
    {
        // We apply the instance ourselves using our own matrices buffer
        instance(count, matrices).toStack()

        return positionLocal // Now positionLocal is relative to the Mesh (not instance)
            .add(vec3(
                0,
                time.mul(float(instanceIndex).div(count)), // Move up
                0
            ))
    })()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.count = count
    mesh.castShadow = true
    scene.add(mesh)

    const matrices = new THREE.InstancedBufferAttribute(new Float32Array(count * 16), 16)
    for(let i = 0; i < count; i++)
    {
        const position = new THREE.Vector3(Math.random(), 0, Math.random())
        const quaternion = new THREE.Quaternion().random() // Random rotation so that the instance Y changes
        const scale = new THREE.Vector3(1, 1, 1)

        const matrix = new THREE.Matrix4()
        matrix.compose(position, quaternion, scale)

        // We need to create our own matrix buffer and not update the instanceMatrix of the Mesh
        matrix.toArray(matrices.array, i * 16)
    }
}

/**
 * Floor
 */
{
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardNodeMaterial())
    floor.rotation.x = - Math.PI * 0.5
    floor.receiveShadow = true
    scene.add(floor)
}

/**
 * Lights
 */
{
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(2, 4, 0)
    directionalLight.castShadow = true
    directionalLight.shadow.radius = 2
    scene.add(directionalLight)
}

/**
 * Animate
 */
const timer = new THREE.Timer()
const tick = () =>
{
    timer.update()

    // Update controls
    controls.update()

    // // Mesh
    // mesh.position.y = (Math.sin(timer.getElapsed()) + 1)

    // Render
    renderer.render(scene, camera)
}
renderer.setAnimationLoop(tick)