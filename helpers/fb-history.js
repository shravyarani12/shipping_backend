import { getDatabase, onValue, set, ref, push,update,get }from "firebase/database";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./fb-credentials.js";



 export function initDBConnection() {
    initializeApp(firebaseConfig);
}

 export function storeHistoryItem(dbObj,data,callback) {
    const db = getDatabase();
    const reference = ref(db, `${dbObj}/`);
    push(reference, data).then(ref=>{
        console.log("Entered")
        return callback(null,ref.key);
    });
    

}


 export function setupDataListener(dbObj,callbackHistory) {
    console.log("setDataListener called");
    const db = getDatabase();
    const reference = ref(db, `${dbObj}/`);
    /*onValue(reference, (snapshot) => {
        console.log("data listener fires up with: ", snapshot)
        if(snapshot?.val()){
            const fbObject=snapshot.val();
            const newArr=[];
            let counter=0;
            let keys=Object.keys(fbObject);
            for(let i=0;i<keys.length;i++){
                //console.log(`${key} || ${index} || ${fbObject[key]}`);
                newArr.push({...fbObject[keys[i]],id:keys[i],seqId:counter})
                counter++;
            }
            return callbackHistory(newArr);
        }else{
            return callbackHistory([]);
        }
    }); */

    get(reference).then(snapshot => {
       // console.log("data listener fires up with: ", snapshot)
        if(snapshot?.val()){
            const fbObject=snapshot.val();
            const newArr=[];
            let counter=0;
            let keys=Object.keys(fbObject);
            for(let i=0;i<keys.length;i++){
                //console.log(`${key} || ${index} || ${fbObject[key]}`);
                newArr.push({...fbObject[keys[i]],id:keys[i],seqId:counter})
                counter++;
            }
            return callbackHistory(newArr);
        }else{
            return callbackHistory([]);
        }
    }).catch(error=>{
        console.log("get Error")
        console.log(error)
    });
}

export function singlesetupDataListener(dbObj,callbackHistory) {
    console.log("setDataListener called");
    const db = getDatabase();
    const reference = ref(db, `${dbObj}/`);
    /*onValue(reference, (snapshot) => {
        console.log("data listener fires up with: ", snapshot)
        if(snapshot?.val()){
            const fbObject=snapshot.val();
            const newArr=[];
            let counter=0;
            let keys=Object.keys(fbObject);
            for(let i=0;i<keys.length;i++){
                //console.log(`${key} || ${index} || ${fbObject[key]}`);
                newArr.push({...fbObject[keys[i]],id:keys[i],seqId:counter})
                counter++;
            }
            return callbackHistory(newArr);
        }else{
            return callbackHistory([]);
        }
    }); */

    get(reference).then(snapshot => {
       // console.log("data listener fires up with: ", snapshot)
        if(snapshot?.val()){
            const fbObject=snapshot.val();
            return callbackHistory(fbObject);
        }else{
            return callbackHistory([]);
        }
    }).catch(error=>{
        console.log("get Error")
        console.log(error)
    });
}


 export function setupDataProfileListener(profile,callbackHistory) {
    console.log("setDataListener called");
    const db = getDatabase();
    const reference = ref(db, `profile/`);
    onValue(reference, (snapshot) => {
       // console.log("data listener fires up with: ", snapshot)
        if(snapshot?.val()){
            const fbObject=snapshot.val();
            const newArr=[];
            let counter=0;
            Object.keys(fbObject).map((key,index)=>{

               // console.log(`${key} || ${index} || ${fbObject[key]}`);
                newArr.push({...fbObject[key],id:key,seqId:counter})
                counter++;
            });
            return callbackHistory(newArr);
        }else{
            return callbackHistory([]);
        }

    });
}


export function getEntry(dbObj,key,callback) {
    const db = getDatabase();
    const reference = ref(db, `${dbObj}/${key}`);
    onValue(reference, (snapshot) => {
      //  console.log("data listener fires up with: ", snapshot)
        if(snapshot?.val()){
            const fbObject=snapshot.val();
            const newArr=[];
            let counter=0;
            Object.keys(fbObject).map((key,index)=>{

                console.log(`${key} || ${index} || ${fbObject[key]}`);
                newArr.push({...fbObject[key],id:key,seqId:counter})
                counter++;
            });
            return callback(newArr);
        }else{
            return callback([]);
        }

    });
    
}


export function updateEntry(dbObj,key,data,callback) {
    const db = getDatabase();
    const reference = ref(db, `${dbObj}/${key}`);
    update(reference, data).then(()=>{
        return callback(null,"done")
    }).catch((error)=>{
        return callback(error,null)
    });
    
}

