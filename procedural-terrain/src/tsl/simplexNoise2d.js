// Three.js Transpiler r165

import { vec3, mod, tslFn, vec2, vec4, dot, floor, cond, sub, max, fract, mul, abs } from 'three/nodes';

const permute = tslFn( ( [ x_immutable ] ) => {

    const x = vec3( x_immutable ).toVar();

    return mod( x.mul( 44.0 ).add( 1.0 ).mul( x ), 299.0 );

} );

const simplexNoise2d = tslFn( ( [ v_immutable ] ) => {

    const v = vec2( v_immutable ).toVar();
    const C = vec4( 0.211324865405187, 0.366025403784439, - 0.577350269189626, 0.024390243902439 );
    const i = vec2( floor( v.add( dot( v, C.yy ) ) ) ).toVar();
    const x0 = vec2( v.sub( i ).add( dot( i, C.xx ) ) ).toVar();
    const i1 = vec2().toVar();
    i1.assign( cond( x0.x.greaterThan( x0.y ), vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) ) );
    const x12 = vec4( x0.xyxy.add( C.xxzz ) ).toVar();
    x12.xy.subAssign( i1 );
    i.assign( mod( i, 299.0 ) );
    const p = vec3( permute( permute( i.y.add( vec3( 0.0, i1.y, 1.0 ) ) ).add( i.x.add( vec3( 0.0, i1.x, 1.0 ) ) ) ) ).toVar();
    const m = vec3( max( sub( 0.5, vec3( dot( x0, x0 ), dot( x12.xy, x12.xy ), dot( x12.zw, x12.zw ) ) ), 0.0 ) ).toVar();
    m.assign( m.mul( m ) );
    m.assign( m.mul( m ) );
    const x = vec3( mul( 2.0, fract( p.mul( C.www ) ) ).sub( 1.0 ) ).toVar();
    const h = vec3( abs( x ).sub( 0.5 ) ).toVar();
    const ox = vec3( floor( x.add( 0.5 ) ) ).toVar();
    const a0 = vec3( x.sub( ox ) ).toVar();
    m.mulAssign( sub( 1.79284291400159, mul( 0.85373472095314, a0.mul( a0 ).add( h.mul( h ) ) ) ) );
    const g = vec3().toVar();
    g.x.assign( a0.x.mul( x0.x ).add( h.x.mul( x0.y ) ) );
    g.yz.assign( a0.yz.mul( x12.xz ).add( h.yz.mul( x12.yw ) ) );

    return mul( 130.0, dot( m, g ) ).toVar();

} );

// layouts

permute.setLayout( {
    name: 'permute',
    type: 'vec3',
    inputs: [
        { name: 'x', type: 'vec3' }
    ]
} );

simplexNoise2d.setLayout( {
    name: 'simplexNoise2d',
    type: 'float',
    inputs: [
        { name: 'v', type: 'vec2' }
    ]
} );

export { permute, simplexNoise2d };
