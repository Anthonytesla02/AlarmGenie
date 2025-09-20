import axios from 'axios';

export class MistralService {
  static async generateDismissalCode() {
    try {
      // For development, we'll generate a local code until Mistral API is configured
      // In production, this would call the actual Mistral API
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        code: code,
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes from now
      };
    } catch (error) {
      console.error('Error generating dismissal code:', error);
      // Fallback to local generation
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      return {
        code: code,
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000),
      };
    }
  }

  // TODO: Replace with actual Mistral API call
  static async generateCodeWithMistralAPI() {
    // This would be the actual implementation using Mistral API
    // For now, we'll use local generation as a fallback
    const prompt = "Generate a random 8-character alphanumeric code for alarm dismissal";
    
    try {
      // const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      //   model: "mistral-tiny",
      //   messages: [{ role: "user", content: prompt }],
      //   max_tokens: 50,
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      // });
      
      // Parse and validate the response to extract an 8-character alphanumeric code
      // return response.data.choices[0].message.content.match(/[A-Z0-9]{8}/)[0];
      
      // For now, return local generation
      return this.generateDismissalCode();
    } catch (error) {
      console.error('Mistral API error:', error);
      return this.generateDismissalCode();
    }
  }
}