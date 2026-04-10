import json
import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import httpx
import asyncio

def decrypt_cryptojs_aes(encrypted_text, password):
    try:
        # Load the encrypted JSON payload
        data = json.loads(base64.b64decode(encrypted_text).decode("utf-8"))
        ct = base64.b64decode(data['ct'])
        salt = bytes.fromhex(data.get('s', ''))
        # iv = bytes.fromhex(data.get('iv', '')) # Not always needed if we re-derive key and iv from password+salt
    except Exception:
        return "Failed to parse CryptoJS JSON payload"
        
    # Re-derive key and iv from password + salt using OpenSSL EVP_BytesToKey
    key_iv = b""
    prev = b""
    while len(key_iv) < 48:
        prev = hashlib.md5(prev + password.encode() + salt).digest()
        key_iv += prev
        
    key = key_iv[:32]
    iv = key_iv[32:48]
    
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_data = unpad(cipher.decrypt(ct), AES.block_size)
    return decrypted_data.decode("utf-8")

async def test_decrypt():
    # Payload found earlier
    req_id = "dXl1RHBYeXlpcW1GWEMzb29Fb3ZCSWZsUUcyTEdPb3lISkNiV0hLTjErdTZQclp6aXRzbStvR0VsMytabVQ3d3RTOUJReDdEWVdBWUh0blhCRlMxYVNGMkp6dmlTSkpENGhxdXFIbCtYNTJkTExOSUtoWW9YNVpka0pDWDV3R3ZBTWVsNXU5ckpOVE1sc1JpejBUMytQcnE5UUJoSU1ZUk9IbElpWGhZNjdxM2JsNUorcnpvRWFML2ZtY0E0VWNSQ3BzSGpFdnl6THRzWnZhbll4c2pEaVlnVUZ4cGpTeG5QbmlReURRd292QllrV2g4dEpPd0o0T0E1bzIwdDBJODB4UFd2SzluTzZQQjZCRVBLTUt3b3c9PQ=="
    
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        res = await client.post(
            "https://animeku.org/api/v9/sources",
            json={"id": req_id},
            headers={"User-Agent": "Mozilla/5.0"}
        )
        print("API Status:", res.status_code)
        data = res.json()
        
        for key_to_decrypt in ["src", "src_sd", "mirror"]:
            encrypted_val = data.get(key_to_decrypt)
            if encrypted_val:
                print(f"\nDecrypting {key_to_decrypt}...")
                key = "3&!Z0M,VIZ;dZW=="
                decrypted = decrypt_cryptojs_aes(encrypted_val, key)
                print(f"Decrypted {key_to_decrypt}:")
                print(decrypted)
                
        # Blog is base64
        if data.get("blog"):
            print("\nBlog decoded:")
            try:
                print(base64.b64decode(data["blog"]).decode())
            except Exception as e:
                print("Failed to decode blog:", e)

if __name__ == "__main__":
    asyncio.run(test_decrypt())
