import yt_dlp

URL = "https://www.blogger.com/video.g?token=AD6v5dwDuyYvEJuY4HftrSVoL7vRq61Bkk6oI-7pP4fodLYjLts6cf0yMWccebEu8TSN4tqMumu1YgM7vIYeZc_h7JfbKUsVLouaTgnwGehWzylP9Ym3iXtesbOd279DC7XR3PjSSkPI"

ydl_opts = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': True,
    'format': 'best'
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(URL, download=False)
    print("Resolved URL:", info.get('url'))
