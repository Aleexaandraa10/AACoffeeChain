import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";     
import "dotenv/config"; // citeste .env

const app = express();
app.use(cors());

// multer = translatorul dintre browser si server pt fisiere
// Upload temporar ca sa putem citi fisierul, nu se salveaza pe disc
const upload = multer({ dest: "uploads/" });

// Doar owner-ul poate adăuga imagini
const OWNER_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();



// =======================================================================
//                      UPLOAD FILE TO PINATA
// ======================================================================
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // verificare permisiuni
    const userWallet = req.headers["x-wallet"]?.toLowerCase();
    if (userWallet !== OWNER_WALLET) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const filePath = req.file.path; //am accesat fisierul temporar
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath)); //construim fisierul pt Pinata


    console.log("Uploading to Pinata...");

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
        ...formData.getHeaders()        
      },
      body: formData,
    });
    const text = await response.text();
    console.log("Pinata response RAW:", text);


    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      console.log("Response was not JSON");
    }

    fs.unlinkSync(filePath); //sterg fisierul temporar altfel umplu serverul

    if (!json.IpfsHash) {
      return res.status(500).json({ error: "Failed upload", json });
    }

    // raspuns catre frontend
    return res.json({
      cid: json.IpfsHash,
      gatewayUrl: `${process.env.PINATA_GATEWAY}/ipfs/${json.IpfsHash}`,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server failed" });
  }
});


// ========================================================
//                    START SERVER
// ========================================================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
