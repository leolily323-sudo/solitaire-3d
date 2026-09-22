import './styles.css';
import {
  ArcRotateCamera, Color3, Color4, DefaultRenderingPipeline, DirectionalLight,
  Engine, GlowLayer, HemisphericLight, Mesh, MeshBuilder, PBRMaterial,
  PointLight, Scene, ShadowGenerator, StandardMaterial, Vector3,
} from '@babylonjs/core';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(.035, .022, .018, 1);
scene.environmentIntensity = .55;

const camera = new ArcRotateCamera('player-camera', Math.PI / 2, 1.08, 19, new Vector3(0, 0, -1.8), scene);
camera.lowerRadiusLimit = 8; camera.upperRadiusLimit = 30;
camera.lowerBetaLimit = .45; camera.upperBetaLimit = 1.3;
camera.wheelDeltaPercentage = .012; camera.panningSensibility = 0;
camera.attachControl(canvas, true);

const pbr = (name: string, color: Color3, roughness = .65, metallic = 0) => {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = color; material.roughness = roughness; material.metallic = metallic;
  return material;
};
const box = (name: string, dimensions: Vector3, position: Vector3, material: PBRMaterial | StandardMaterial) => {
  const mesh = MeshBuilder.CreateBox(name, { width: dimensions.x, height: dimensions.y, depth: dimensions.z }, scene);
  mesh.position = position; mesh.material = material; mesh.receiveShadows = true; return mesh;
};

const walnut = pbr('walnut', Color3.FromHexString('#3b2115'), .44);
const brass = pbr('brass', Color3.FromHexString('#b77832'), .24, .72);
const wall = pbr('wall', Color3.FromHexString('#21140f'), .92);
const floor = pbr('wood-floor', Color3.FromHexString('#24130c'), .56);
const felt = pbr('casino-felt', Color3.FromHexString('#075d3d'), .91);

box('floor', new Vector3(36,.2,36), new Vector3(0,-4.7,0), floor);
box('back-wall', new Vector3(36,13,.3), new Vector3(0,1.65,-14), wall);
box('left-wall', new Vector3(.3,13,36), new Vector3(-18,1.65,0), wall);
box('right-wall', new Vector3(.3,13,36), new Vector3(18,1.65,0), wall);
box('ceiling', new Vector3(36,.3,36), new Vector3(0,8.2,0), wall);

box('table-felt', new Vector3(16,.42,11.5), new Vector3(0,0,0), felt);
box('table-apron', new Vector3(16.5,.72,12), new Vector3(0,-.48,0), walnut);
for (const x of [-7,7]) for (const z of [-4.7,4.7])
  box('table-leg',new Vector3(.72,4.2,.72),new Vector3(x,-2.55,z),walnut);
box('far-rail',new Vector3(16.7,.17,.17),new Vector3(0,.32,-5.85),brass);
box('near-rail',new Vector3(16.7,.17,.17),new Vector3(0,.32,5.85),brass);
box('left-rail',new Vector3(.17,.17,11.6),new Vector3(-8.25,.32,0),brass);
box('right-rail',new Vector3(.17,.17,11.6),new Vector3(8.25,.32,0),brass);

const cardFace = pbr('card-stock', new Color3(.93,.91,.84), .46);
const cardBack = pbr('card-back', Color3.FromHexString('#123c75'), .32, .05);
function card(x:number,z:number,faceUp=true,depth=0) {
  const mesh=box('card',new Vector3(1.35,.055,1.9),new Vector3(x,.26+depth*.035,z),faceUp?cardFace:cardBack);
  mesh.rotation.y=(Math.random()-.5)*.012; return mesh;
}
card(-6,-4,false); card(-4.2,-4,true);
for(let col=0;col<7;col++) for(let row=0;row<=col;row++) card(-6+col*2,-.9+row*.42,row===col,row);

const ambient = new HemisphericLight('ambient',new Vector3(0,1,0),scene);
ambient.intensity=.32; ambient.groundColor=new Color3(.08,.035,.02);
const moon = new DirectionalLight('moon',new Vector3(-.3,-1,.5),scene);
moon.position=new Vector3(7,10,-8); moon.intensity=1.15;
const shadows = new ShadowGenerator(2048,moon); shadows.usePercentageCloserFiltering=true;
scene.meshes.forEach(mesh=>{ if(mesh instanceof Mesh && mesh.name!=='floor') shadows.addShadowCaster(mesh); });
for (const x of [-9,9]) {
  const lamp=new PointLight('warm-lamp',new Vector3(x,5,-10.5),scene);
  lamp.diffuse=Color3.FromHexString('#ffad58'); lamp.intensity=85; lamp.range=13;
  const bulb=MeshBuilder.CreateSphere('lamp-glow',{diameter:.22},scene); bulb.position=lamp.position.clone();
  const emissive=pbr('lamp-emissive',Color3.FromHexString('#ffd19a'),.3);
  emissive.emissiveColor=Color3.FromHexString('#ff9b38'); emissive.emissiveIntensity=6; bulb.material=emissive;
}

const glow = new GlowLayer('subtle-glow',scene,{blurKernelSize:32}); glow.intensity=.22;
const pipeline = new DefaultRenderingPipeline('cinematic',true,scene,[camera]);
pipeline.fxaaEnabled=true; pipeline.bloomEnabled=true; pipeline.bloomThreshold=.82; pipeline.bloomWeight=.18;
pipeline.imageProcessingEnabled=true; pipeline.imageProcessing.contrast=1.22; pipeline.imageProcessing.exposure=1.08;

const views = [
  {label:'Seat',alpha:Math.PI/2,beta:1.08,radius:19,target:new Vector3(0,0,-1.8)},
  {label:'Table',alpha:Math.PI/2,beta:.53,radius:22,target:new Vector3(0,0,0)},
  {label:'Close',alpha:Math.PI/2,beta:1.18,radius:11,target:new Vector3(0,.1,-1.5)},
];
let view=0;
document.querySelector<HTMLButtonElement>('#camera')!.onclick=()=>{
  view=(view+1)%views.length; const next=views[view];
  camera.alpha=next.alpha; camera.beta=next.beta; camera.radius=next.radius; camera.setTarget(next.target);
  document.querySelector('#camera small')!.textContent=next.label;
};

engine.runRenderLoop(()=>scene.render());
addEventListener('resize',()=>engine.resize());
