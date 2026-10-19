import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

function initializeLogo() {
  const host = document.querySelector('.scroll-emblem');
  if (!host || host.dataset.logoInitialized) return;
  host.dataset.logoInitialized = 'true';
  const canvasHost = host.querySelector('.logo-canvas');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer, frameHandle = 0, elapsed = 0, previous = 0, paused = reducedMotion.matches;
  let visible = true;
  const fallback = () => {
    host.classList.remove('live-3d');
    host.classList.add('video-fallback');
  };
  try {
    if (reducedMotion.matches) {
      host.classList.add('video-fallback');
    } else {
      renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      canvasHost.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
      camera.position.set(0,.15,6.7);
      camera.lookAt(0,0,0);
      scene.add(new THREE.AmbientLight(0xffffff,.9));
      const frontFill = new THREE.DirectionalLight(0xffe1b7,3.2);
      frontFill.position.set(1,2,6);
      scene.add(frontFill);
      const spot = new THREE.SpotLight(0xffe7c7,28);
      spot.position.set(3,5,4);
      spot.angle=.5;
      spot.penumbra=1;
      scene.add(spot);
      const rim = new THREE.PointLight(0xe6c897,8);
      rim.position.set(-4,1,2);
      scene.add(rim);
      const emblem = new THREE.Group();
      scene.add(emblem);
      const contour = new THREE.Group();
      contour.scale.set(.006,-.006,.006);
      contour.position.set(-1.17,1.55,-.036);
      emblem.add(contour);
      const materials=[];
      fetch('/images/sterlyn-monogram-preview.svg').then(response=>{
        if(!response.ok) throw new Error('Logo contour unavailable');
        return response.text();
      }).then(markup=>{
        const paths=new SVGLoader().parse(markup).paths;
        for(const shape of paths.flatMap(path=>SVGLoader.createShapes(path))){
          const geometry=new THREE.ExtrudeGeometry(shape,{depth:8,bevelEnabled:true,bevelThickness:1,bevelSize:.85,bevelSegments:2,steps:1,curveSegments:96});
          const material=new THREE.MeshStandardMaterial({color:'#dfbd90',metalness:.48,roughness:.28,emissive:'#a77945',emissiveIntensity:.07,side:THREE.DoubleSide});
          materials.push(material);
          contour.add(new THREE.Mesh(geometry,material));
        }
        if(!materials.length) throw new Error('Logo contour is empty');
        host.classList.add('live-3d');
        const resize=()=>{
          const width=Math.max(1,canvasHost.clientWidth),height=Math.max(1,canvasHost.clientHeight);
          camera.aspect=width/height;
          camera.updateProjectionMatrix();
          renderer.setSize(width,height,false);
        };
        new ResizeObserver(resize).observe(canvasHost);
        resize();
        const cycle=t=>{
          const p=((t%10)+10)%10;
          const u=Math.min(p/6,1);
          const ease=u*u*u*(u*(u*6-15)+10);
          return {rotation:ease*Math.PI*2,light:p<6?0:Math.sin(Math.PI*(p-6)/4)**2};
        };
        const draw=now=>{
          frameHandle=requestAnimationFrame(draw);
          const dt=previous ? Math.min((now-previous)/1000,.05) : 0;
          previous=now;
          if(!visible || reducedMotion.matches) return;
          if(!paused) elapsed+=dt;
          const state=cycle(elapsed);
          emblem.rotation.y=state.rotation;
          for(const material of materials) material.emissiveIntensity=.07+state.light*.26;
          renderer.render(scene,camera);
        };
        frameHandle=requestAnimationFrame(draw);
        new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(host);
        addEventListener('sterlyn-motion',event=>{paused=event.detail.paused;});
        reducedMotion.addEventListener('change',event=>{paused=event.matches;host.classList.toggle('video-fallback',event.matches);});
      }).catch(fallback);
    }
  } catch { fallback(); }
  addEventListener('pagehide',()=>{if(frameHandle)cancelAnimationFrame(frameHandle);renderer?.dispose();},{once:true});
}
initializeLogo();
addEventListener('sterlyn-hero-ready', initializeLogo, {once:true});
