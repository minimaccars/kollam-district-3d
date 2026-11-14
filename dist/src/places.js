// District viewpoints. Coordinates [longitude, latitude]; these locate views, not entrances.
export const LANDMARKS = [
 {id:'beach',n:'Kollam Beach',ml:'കൊല്ലം ബീച്ച്',ll:[76.5874,8.8747],chip:'Kollam Beach',v:{d:1600,h:62,t:70}},
 {id:'lighthouse',n:'Thangassery Lighthouse',ml:'തങ്കശ്ശേരി വിളക്കുമാടം',ll:[76.565980,8.880645],chip:'Thangassery',v:{d:550,h:65,t:68}},
 {id:'ashtamudi',n:'Ashtamudi Lake',ml:'അഷ്ടമുടിക്കായൽ',ll:[76.596,8.965],chip:'Ashtamudi',water:true,v:{d:9500,h:25,t:65}},
 {id:'munroe',n:'Munroe Island',ml:'മൺറോത്തുരുത്ത്',ll:[76.611,8.996],chip:'Munroe Island',v:{d:2600,h:62,t:68}},
 {id:'neendakara',n:'Neendakara Harbour',ml:'നീണ്ടകര',ll:[76.5406,8.9392],chip:'Neendakara',v:{d:1900,h:60,t:68}},
 {id:'sasthamkotta',n:'Sasthamkotta Lake',ml:'ശാസ്താംകോട്ട കായൽ',ll:[76.627,9.035],chip:'Sasthamkotta',water:true,v:{d:5200,h:45,t:60}},
 {id:'paravur',n:'Paravur Backwaters',ml:'പരവൂർ കായൽ',ll:[76.658,8.812],chip:'Paravur',water:true,v:{d:4400,h:40,t:65}},
 {id:'jatayu',n:'Jatayu Earth’s Center',ml:'ജടായുപ്പാറ',ll:[76.867204,8.865955],chip:'Jatayu',v:{d:2100,h:62,t:66}},
 {id:'punalur',n:'Punalur Suspension Bridge',ml:'പുനലൂർ തൂക്കുപാലം',ll:[76.927600,9.018052],chip:'Punalur',v:{d:1200,h:62,t:65}},
 {id:'thenmala',n:'Thenmala',ml:'തെന്മല',ll:[77.0608,8.9592],chip:'Thenmala',v:{d:6200,h:62,t:62}},
 {id:'palaruvi',n:'Palaruvi Falls',ml:'പാലരുവി',ll:[77.153062,8.954295],chip:'Palaruvi',v:{d:2300,h:60,t:64}},
 {id:'achankovil',n:'Achankovil',ml:'അച്ചൻകോവിൽ',ll:[77.125,9.09],v:{d:5000,h:60,t:60}},
 {id:'kottarakkara',n:'Kottarakkara',ml:'കൊട്ടാരക്കര',ll:[76.776,9.002],v:{d:2200,h:62,t:68}},
 {id:'karunagappally',n:'Karunagappally',ml:'കരുനാഗപ്പള്ളി',ll:[76.535,9.055],v:{d:2300,h:62,t:68}},
 {id:'thirumullavaram',n:'Thirumullavaram Beach',ml:'തിരുമുല്ലവാരം',ll:[76.561,8.902],v:{d:1700,h:62,t:70}},
 {id:'sea',n:'Arabian Sea',ml:'അറബിക്കടൽ',ll:[76.44,8.9],water:true,v:{d:18000,h:70,t:65}}
];
// The original 42° lens, heading 62° and tilt 70° retain the source's perspective.
export const VIEWS = {
 home:{ll:[76.5868,8.887],d:3400,h:62,t:70},
 city:{ll:[76.85,8.96],d:112000,h:20,t:38}
};
const stop=(id,text,time=17.6)=>{const p=LANDMARKS.find(x=>x.id===id);return {n:p.n,ml:p.ml,ll:p.ll,v:p.v,time,text};};
export const TOURS = {
 sights:{title:'District tour',sub:'Coast, backwaters & the Ghats',stops:[
  stop('beach','Begin on Kollam’s Arabian Sea coast. Drag to look around, or follow the stops from the old port to the eastern hills.'),
  stop('lighthouse','The striped lighthouse at Thangassery marks Kollam’s maritime heritage. The model is a stylised landmark, not a surveyed architectural reconstruction.'),
  stop('munroe','A network of waterways and low islands where the Kallada River meets Ashtamudi. The map follows real water and building geometry.',16.5),
  stop('sasthamkotta','A freshwater lake north of Kollam. Zoom out to see its setting between settlements and low hills.',16.5),
  stop('jatayu','The rocky hill at Chadayamangalam is home to Jatayu Earth’s Center. This viewpoint shows the hill terrain; the sculpture is not modelled.',17.2),
  stop('punalur','The historic suspension bridge crosses the Kallada River. The bridge shown here is a simplified visual reconstruction.',17.2),
  stop('thenmala','Follow the district east into the Western Ghats. Thenmala’s forested slopes and reservoir are rendered from elevation and satellite data.',16),
  stop('palaruvi','A viewpoint over the forested valley around Palaruvi. The waterfall itself is not a fluid simulation.',16.2),
  stop('achankovil','End among the wooded hills around Achankovil. Choose Whole district to see the complete coast-to-hills landscape.',17.6)
 ]},
 food:{title:'Backwater trail',sub:'Five views along the water',stops:[
  stop('neendakara','Begin at the harbour near the sea entrance to Ashtamudi. Roads and building footprints are taken from open geographic data.'),
  stop('ashtamudi','Explore the branching arms of Ashtamudi Lake. Change the time slider to watch reflections and shoreline lighting shift.'),
  stop('munroe','Move into the island waterways. Tree positions are generated from satellite greenery; they are not individually mapped trees.',16.5),
  stop('sasthamkotta','Turn north toward Sasthamkotta’s freshwater lake. Labels can be switched between English and Malayalam.',17),
  stop('paravur','Finish at the southern backwaters near Paravur. Open Postcard to save this view in the same style as the original map.',17.8)
 ]}
};
