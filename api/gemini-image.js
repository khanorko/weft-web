export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key not configured' });
  }

  const { title, keywords } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const prompt = `Create an abstract, editorial illustration for a tech news article titled: "${title}". Keywords: ${(keywords || []).join(', ')}. Style: minimal, dark background, geometric shapes, warm gold accent color (#f5a623). No text in the image.`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!imageBase64) {
      return res.status(500).json({ error: 'No image generated' });
    }

    return res.status(200).json({
      image: `data:image/png;base64,${imageBase64}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}
