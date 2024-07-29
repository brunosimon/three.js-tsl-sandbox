import * as THREE from 'three/webgpu'
import { max, uv, mx_noise_float, color, cross, dot, float, modelNormalMatrix, positionLocal, sign, smoothstep, step, tslFn, uniform, varyingProperty, vec2, vec3, loop } from 'three/webgpu'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import GUI from 'lil-gui'

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
const rgbeLoader = new RGBELoader()

// // Axes helper
// const axesHelper = new THREE.AxesHelper()
// axesHelper.position.y = 0.5
// scene.add(axesHelper)

/**
 * Environment map
 */
rgbeLoader.load('/spruit_sunrise.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping

    scene.background = environmentMap
    scene.backgroundBlurriness = 0.5
    scene.environment = environmentMap
})

/**
 * Cursor interaction
 */
const cursor = {}
cursor.screenCoordinates = new THREE.Vector2()
cursor.lastTerrainCoordinates = new THREE.Vector2()
cursor.terrainCoordinates = new THREE.Vector2()
cursor.raycaster = new THREE.Raycaster()
cursor.down = false
cursor.hover = false

cursor.object = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 1, 1), new THREE.MeshBasicMaterial())
cursor.object.rotation.x = - Math.PI * 0.5
cursor.object.visible = false
scene.add(cursor.object)

cursor.getIntersect = () =>
{
    cursor.raycaster.setFromCamera(cursor.screenCoordinates, camera)
    const intersects = cursor.raycaster.intersectObject(cursor.object)
    if(intersects.length)
        return intersects[0]

    return null
}

window.addEventListener('pointermove', (event) =>
{
    cursor.screenCoordinates.x = (event.clientX / sizes.width - 0.5) * 2
    cursor.screenCoordinates.y = - (event.clientY / sizes.height - 0.5) * 2
})

window.addEventListener('pointerdown', (event) =>
{
    if(cursor.hover)
    {
        canvas.style.cursor = 'grabbing'
        controls.enabled = false
        cursor.down = true
        cursor.object.scale.setScalar(10)

        const intersect = cursor.getIntersect()
        cursor.lastTerrainCoordinates.set(intersect.point.x, intersect.point.z)
        cursor.terrainCoordinates.set(intersect.point.x, intersect.point.z)
    }
})

window.addEventListener('pointerup', (event) =>
{
    cursor.down = false
    controls.enabled = true
    cursor.object.scale.setScalar(1)
})

// /**
//  * Test
//  */
// const mesh = new THREE.Mesh(
//     new THREE.PlaneGeometry(2, 2),
//     new THREE.MeshBasicNodeMaterial()
// )
// mesh.rotation.y = - Math.PI * 0.5
// mesh.position.y = 2
// scene.add(mesh)

// const test = max(0, mx_noise_float(uv().mul(5), 1, 0))
// mesh.material.outputNode = THREE.vec4(vec3(test), 1)

/**
 * Terrain
 */
// Material
const material = new THREE.MeshStandardNodeMaterial({
    metalness: 0,
    roughness: 0.5,
    color: '#85d534'
})

// Uniforms
const noiseIterations = uniform(3)
const positionFrequency = uniform(0.15)
const warpFrequency = uniform(9)
const warpStrength = uniform(1)
const strength = uniform(10)
const offset = uniform(vec2(0, 0))
const neighboursShift = uniform(0.01)

const colorWaterDeep = uniform(color('#002b3d'))
const colorWaterSurface = uniform(color('#66a8ff'))
const colorSand = uniform(color('#ffe894'))
const colorGrass = uniform(color('#85d534'))
const colorSnow = uniform(color('#ffffff'))
const colorRock = uniform(color('#bfbd8d'))

// Varyings
const vNormal = varyingProperty('vec3')
const vPosition = varyingProperty('vec3')

// Get elevation
const getElevation = tslFn(([position]) =>
{
    const warpedPosition = position.add(offset)
    warpedPosition.addAssign(mx_noise_float(warpedPosition.mul(positionFrequency).mul(warpFrequency), 1, 0).mul(warpStrength))
    
    const elevation = float(0).toVar()
    loop({ type: 'float', start: 1, end: noiseIterations, condition: '<=' }, ({ i }) =>
    {
        const noiseInput = warpedPosition.mul(positionFrequency).mul(i.mul(2)).add(i.mul(987))
        const noise = mx_noise_float(noiseInput, 1, 0).div(i.add(1).mul(2))
        elevation.addAssign(noise)
    })

    const elevationSign = sign(elevation)
    elevation.assign(elevation.abs().pow(2).mul(elevationSign).mul(strength))

    return elevation
})

// Position
material.positionNode = tslFn(() =>
{
    // Neighbours positions
    const neighbourA = positionLocal.xyz.add(vec3(neighboursShift, 0.0, 0.0))
    const neighbourB = positionLocal.xyz.add(vec3(0.0, 0.0, neighboursShift.negate()))

    // Elevations
    const position = positionLocal.xyz.toVar()
    const elevation = getElevation(positionLocal.xz)
    position.y.addAssign(elevation)
    
    neighbourA.y.addAssign(getElevation(neighbourA.xz))
    neighbourB.y.addAssign(getElevation(neighbourB.xz))

    // Compute normal
    const toA = neighbourA.sub(position).normalize()
    const toB = neighbourB.sub(position).normalize()
    vNormal.assign(cross(toA, toB))

    // Varyings
    vPosition.assign(position.add(vec3(offset.x, 0, offset.y)))

    return position
})()

// Normal
material.normalNode = modelNormalMatrix.mul(vNormal)

// Color
material.colorNode = tslFn(() =>
{
    const finalColor = colorWaterDeep.toVar()

    // Water
    const surfaceWaterMix = smoothstep(-1.0, -0.1, vPosition.y)
    finalColor.assign(surfaceWaterMix.mix(finalColor, colorWaterSurface))

    // Sand
    const sandMix = step(- 0.1, vPosition.y)
    finalColor.assign(sandMix.mix(finalColor, colorSand))

    // Grass
    const grassMix = step(- 0.06, vPosition.y)
    finalColor.assign(grassMix.mix(finalColor, colorGrass))

    // Rock
    const rockMix = step(0.5, dot(vNormal, vec3(0, 1, 0))).oneMinus()
    rockMix.mulAssign(step(- 0.06, vPosition.y))
    finalColor.assign(rockMix.mix(finalColor, colorRock))

    // Snow
    const snowThreshold = mx_noise_float(vPosition.xz.mul(25), 1, 0).mul(0.1).add(0.45)
    const snowMix = step(snowThreshold, vPosition.y);
    finalColor.assign(snowMix.mix(finalColor, colorSnow))

    return finalColor
})()

// Geometry
const geometry = new THREE.PlaneGeometry(10, 10, 500, 500)
geometry.deleteAttribute('uv')
geometry.deleteAttribute('normal')
geometry.rotateX(- Math.PI * 0.5)

// Mesh
const terrain = new THREE.Mesh(geometry, material)
terrain.receiveShadow = true
terrain.castShadow = true
scene.add(terrain)

// Debug
const terrainFolder = gui.addFolder('🏔️ terrain')
terrainFolder.add(noiseIterations, 'value', 0, 10, 1).name('noiseIterations')
terrainFolder.add(positionFrequency, 'value', 0, 1, 0.001).name('positionFrequency')
terrainFolder.add(strength, 'value', 0, 20, 0.001).name('strength')
terrainFolder.add(warpFrequency, 'value', 0, 10, 0.001).name('warpFrequency')
terrainFolder.add(warpStrength, 'value', 0, 1, 0.001).name('warpStrength')

terrainFolder.addColor({ color: colorWaterDeep.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorWaterDeep.value.set(value) }).name('colorWaterDeep')
terrainFolder.addColor({ color: colorWaterSurface.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorWaterSurface.value.set(value) }).name('colorWaterSurface')
terrainFolder.addColor({ color: colorSand.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorSand.value.set(value) }).name('colorSand')
terrainFolder.addColor({ color: colorGrass.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorGrass.value.set(value) }).name('colorGrass')
terrainFolder.addColor({ color: colorSnow.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorSnow.value.set(value) }).name('colorSnow')
terrainFolder.addColor({ color: colorRock.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorRock.value.set(value) }).name('colorRock')

/**
 * Water
 */
const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 1, 1),
    new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.3
    })
)
water.rotation.x = - Math.PI * 0.5
water.position.y = - 0.1
scene.add(water)

/**
 * Board
 */
// Brushes
const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11))
const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10))

// Evaluate
const evaluator = new Evaluator()
const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION)
board.geometry.clearGroups()
board.material = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: 0.3 })
board.castShadow = true
board.receiveShadow = true
scene.add(board)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 2)
directionalLight.position.set(6.25, 3, 4)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.near = 0.1
directionalLight.shadow.camera.far = 30
directionalLight.shadow.camera.top = 8
directionalLight.shadow.camera.right = 8
directionalLight.shadow.camera.bottom = -8
directionalLight.shadow.camera.left = -8
directionalLight.shadow.normalBias = 0.05
directionalLight.shadow.bias = 0
scene.add(directionalLight)

const lightFolder = gui.addFolder('💡 Light')
lightFolder.add(directionalLight.shadow, 'normalBias', 0, 0.1, 0.0001)
lightFolder.add(directionalLight.shadow, 'bias', -0.1, 0, 0.0001)

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
camera.position.set(-10, 6, -6)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.y = - 0.5
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas
})
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#000000')

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    // Cursor
    const intersect = cursor.getIntersect()

    if(intersect)
    {
        cursor.hover = true

        if(!cursor.down)
            canvas.style.cursor = 'grab'
    }
    else
    {
        cursor.hover = false
        canvas.style.cursor = 'default'
    }
    
    if(cursor.hover && cursor.down)
    {
        cursor.terrainCoordinates.set(intersect.point.x, intersect.point.z)
        const delta = cursor.lastTerrainCoordinates.sub(cursor.terrainCoordinates)

        offset.value.x += delta.x
        offset.value.y += delta.y
    }

    cursor.lastTerrainCoordinates.copy(cursor.terrainCoordinates)

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()