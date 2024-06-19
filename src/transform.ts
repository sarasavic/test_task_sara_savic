import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const apiUrl = 'https://rest-test-eight.vercel.app/api/test';

//in-memory cache-iranje za transformisane podatke
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minut


//predstavlja fileUrl koji je tipa string
export interface FileUrl {
    fileUrl: string;
  }
  
  //predstavlja "items" ->(npr. "items":[{"fileUrl":"http://34.8.32.234:48183/$360Section/"}... na samom pocetku kad se ode na https://rest-test-eight.vercel.app/api/test)
  //i to bi bio niz FileUrl-ova
  export interface ApiResponse {
    items: FileUrl[];
  }
  // TransformedData bi bio jedan objekat gde je svaki key string (u nasem slucaju IP adresa), a vrednost moze biti bilo kog tipa (any)
  export interface TransformedData {
    [ipAddress: string]: Array<any>;
  }

  // transformise ApiResponse u neku nasu strukturu koju cemo nazvati TransformedData
  export function transformData(data: ApiResponse): TransformedData {

    //inicijalizacija nase TransformedData strukture
    const transformed: TransformedData = {};
  
    //u ovom delu prolazimo kroz svaku stavku, item
    data.items.forEach(item => {
      //console.log("item ", item)

      //izvlacimo "delove" iz fileUrl-a
      const url = new URL(item.fileUrl);
      const ipAddress = url.hostname;
      const path_segmenti = url.pathname.split('/').filter(Boolean);
  
      //proverava da li transformed objekat vec ima ipAddress kakko smo gore naveli...ako nema, inicijalizujemo kao prazan niz
      if (!transformed[ipAddress]) {
        transformed[ipAddress] = [];
      }
  
      //idemo kroz delove putanje
      let trenutniNivo = transformed[ipAddress];
  
      //idemo kroz segmente Url putanje (path_segmenti), ono sto dodje posle porta
      for (let i = 0; i < path_segmenti.length; i++) {
        const deo = path_segmenti[i];
  
        if (i === path_segmenti.length - 1) {

          //ako je "deo" poslednji deo putanje, smatramo ga za fajl
          trenutniNivo.push(deo);

        } else {

          //ako je na primer direktorijum...find trazi key(kljuc) koji predstavlja "deo"
          let sledeciNivo = trenutniNivo.find(nivo => typeof nivo === 'object' && nivo.hasOwnProperty(deo));
  
          //ako nema direktorijuma na trenutnom nivou, kreiramo novi i push-amo na trenutniNivo
          if (!sledeciNivo) {
            sledeciNivo = { [deo]: [] };
            trenutniNivo.push(sledeciNivo);
          }

          //update-ujemo trenutni nivo sa trenutnim ili mozda novokreiranim direktorijumom
          trenutniNivo = sledeciNivo[deo];
        }
      }
    });
  
    //vracamo "transformisani" objekat, njegovu novu strukturu
    return transformed;
  };
  

  router.get('/', async (req: Request, res: Response) => {

    const now = Date.now();

    //cachedData - da li je cache validan, a cacheTimestamp oznacava kada su podaci bili poslednji put kesirani
    //CACHE_DURATION predstavlja vremenski period za koji se cache smatra validnim
    if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
      
      //ako je sve validno, vracamo kesirane podatke u obliku JSON-a
        return res.json(cachedData);
    }

    try {
        const response = await axios.get(apiUrl);
        //transformiemo nase podatke pozivajuci f-ju iznad
        const transformedData = transformData(response.data);
        cachedData = transformedData; //novi transformisani podaci
        cacheTimestamp = now; //sadasnje vreme, sa svezim podacima
        res.json(transformedData); //podaci ce se klijentu pokazati u JSON obliku
    } catch (error) {
        res.status(500).json({ error: 'Fail' });
    }
});

export default router;