import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { If, PI, PI2, SpriteNodeMaterial, color, cos, discard, instanceIndex, mix, mod, positionGeometry, sin, storage, texture, tslFn, uniform, uv, varying, vec3, vec4, vertexIndex } from 'three/examples/jsm/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

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
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 16
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new WebGPURenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const clearColor = new THREE.Color('#191017')
gui.addColor({ color: clearColor.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { renderer.setClearColor(value) })

renderer.setClearColor(clearColor.getHex(THREE.SRGBColorSpace))

/**
 * Displacement
 */
const displacement = {}

// 2D canvas
displacement.canvas = document.createElement('canvas')
displacement.canvas.width = 128
displacement.canvas.height = 128
displacement.canvas.style.position = 'fixed'
displacement.canvas.style.width = '256px'
displacement.canvas.style.height = '256px'
displacement.canvas.style.top = 0
displacement.canvas.style.left = 0
displacement.canvas.style.zIndex = 10
document.body.append(displacement.canvas)

// Context
displacement.context = displacement.canvas.getContext('2d')
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)

// Glow image
displacement.glowImage = new Image()
displacement.glowImage.src = './glow.png'

// Interactive plane
displacement.interactivePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide })
)
displacement.interactivePlane.visible = false
scene.add(displacement.interactivePlane)

// Raycaster
displacement.raycaster = new THREE.Raycaster()

// Coordinates
displacement.screenCursor = new THREE.Vector2(9999, 9999)
displacement.canvasCursor = new THREE.Vector2(9999, 9999)
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999)

window.addEventListener('pointermove', (event) =>
{
    displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1
    displacement.screenCursor.y = - (event.clientY / sizes.height) * 2 + 1
})

// Texture
displacement.texture = new THREE.CanvasTexture(displacement.canvas)

/**
 * Particles
 */
// Setup
const material = new SpriteNodeMaterial()
const size = 128
const count = size * size

// Attributes
const positionArray = new Float32Array(count * 3)
const uvArray = new Float32Array(count * 2)
for(let i = 0; i < count; i++)
{
    const i3 = i * 3
    const i2 = i * 2

    const uvX = i % size / size
    const uvY = Math.floor(i / size) / size

    positionArray[i3    ] = (uvX - 0.5) * 10
    positionArray[i3 + 1] = (uvY - 0.5) * 10
    positionArray[i3 + 2] = 0

    uvArray[i2    ] = uvX
    uvArray[i2 + 1] = uvY
}

const positionAttribute = storage(new StorageInstancedBufferAttribute(positionArray, 3), 'vec3', count).toAttribute()
const uvAttribute = storage(new StorageInstancedBufferAttribute(uvArray, 2), 'vec2', count).toAttribute()

// Picture
const pictureTexture = textureLoader.load('./picture-1.png')
const pictureStrength = varying(texture(pictureTexture, uvAttribute).r)

// Colors
const colorA = uniform(color('#ffa575'))
const colorB = uniform(color('#6a1599'))

// Displacement
const displacementTexture = texture(displacement.texture, uvAttribute)
const displacementStrength = displacementTexture.smoothstep(0.1, 0.3)
const displacementAngle = instanceIndex.hash().mul(PI2)
const displacementPosition = vec3(cos(displacementAngle).mul(0.2), sin(displacementAngle).mul(0.2), 1).normalize().mul(displacementStrength).mul(3)

// Position
material.positionNode = positionAttribute.add(displacementPosition)

// Scale
material.scaleNode = pictureStrength.oneMinus().pow(2).oneMinus().mul(0.075)

// Color
material.colorNode = tslFn(() =>
{
    uv().sub(0.5).length().greaterThan(0.5).discard()
    return vec4(mix(colorB, colorA, pictureStrength.pow(2)), 1)
})()

// Mesh
const geometry = new THREE.PlaneGeometry(1, 1)
const particles = new THREE.InstancedMesh(geometry, material, count)
scene.add(particles)

// Debug
gui.addColor({ color: colorA.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorA.value.set(value) })
gui.addColor({ color: colorB.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorB.value.set(value) })

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    /**
     * Raycaster
     */
    displacement.raycaster.setFromCamera(displacement.screenCursor, camera)
    const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane)

    if(intersections.length)
    {
        const uv = intersections[0].uv
        
        displacement.canvasCursor.x = uv.x * displacement.canvas.width
        displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height
    }

    /**
     * Displacement
     */
    // Fade out
    displacement.context.globalCompositeOperation = 'source-over'
    displacement.context.globalAlpha = 0.02
    displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)

    // Speed alpha
    const cursorDistance = displacement.canvasCursorPrevious.distanceTo(displacement.canvasCursor)
    displacement.canvasCursorPrevious.copy(displacement.canvasCursor)
    const alpha = Math.min(cursorDistance * 0.05, 1)
    
    // Draw glow
    const glowSize = displacement.canvas.width * 0.25
    displacement.context.globalCompositeOperation = 'lighten'
    displacement.context.globalAlpha = alpha
    displacement.context.drawImage(
        displacement.glowImage,
        displacement.canvasCursor.x - glowSize * 0.5,
        displacement.canvasCursor.y - glowSize * 0.5,
        glowSize,
        glowSize
    )

    // Texture
    displacement.texture.needsUpdate = true

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()