// Simplified Iris Detector - No OpenCV Required
class IrisDetector {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      stream.getTracks().forEach(track => track.stop());
      this.isInitialized = true;
      console.log('Iris detector initialized');
      return true;
    } catch (error) {
      console.error('Iris detector initialization failed:', error);
      throw error;
    }
  }

  async detectIris(videoElement) {
    if (!this.isInitialized) {
      throw new Error('Iris detector not initialized');
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const regionSize = 100;
      
      const imageData = ctx.getImageData(
        centerX - regionSize/2, 
        centerY - regionSize/2, 
        regionSize, 
        regionSize
      );
      
      const irisTemplate = this.createSimplifiedIrisTemplate(imageData);
      
      return irisTemplate;
    } catch (error) {
      console.error('Iris detection error:', error);
      return null;
    }
  }

  createSimplifiedIrisTemplate(imageData) {
    const template = [];
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      template.push(brightness);
    }
    
    return template;
  }

  compareIrisTemplates(template1, template2, threshold = 0.75) {
    if (!template1 || !template2 || template1.length !== template2.length) {
      return false;
    }

    let matches = 0;
    const tolerance = 30;
    
    for (let i = 0; i < template1.length; i++) {
      if (Math.abs(template1[i] - template2[i]) < tolerance) {
        matches++;
      }
    }
    
    const similarity = matches / template1.length;
    console.log(`Iris similarity: ${(similarity * 100).toFixed(2)}%`);
    return similarity >= threshold;
  }
}

export default IrisDetector;