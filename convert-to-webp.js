const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WebPConverter {
  constructor() {
    this.processedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
  }

  // Verificar si sharp está instalado
  ensureSharp() {
    try {
      require.resolve('sharp');
    } catch (e) {
      console.log('📦 Instalando sharp...');
      execSync('npm install sharp', { stdio: 'inherit' });
    }
    return require('sharp');
  }

  async convertImages() {
    const sharp = this.ensureSharp();
    const sourceDir = './tiles';
    const targetDir = './tiles_webp';

    if (!fs.existsSync(sourceDir)) {
      console.error('❌ No se encuentra la carpeta tiles/');
      return;
    }

    console.log('🚀 Convirtiendo imágenes a WebP...\n');
    await this.processDirectory(sourceDir, targetDir, sharp);
    this.printSummary();
  }

  async processDirectory(sourceDir, targetDir, sharp) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const items = fs.readdirSync(sourceDir);

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        await this.processDirectory(sourcePath, targetPath, sharp);
      } else if (this.isImageFile(item)) {
        await this.convertImage(sourcePath, targetPath, sharp);
      }
    }
  }

  isImageFile(filename) {
    return /\.(jpg|jpeg|png)$/i.test(filename);
  }

  async convertImage(sourcePath, targetPath, sharp) {
    try {
      const webpPath = targetPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      
      // Saltar si ya existe y es más reciente
      if (fs.existsSync(webpPath)) {
        const webpTime = fs.statSync(webpPath).mtimeMs;
        const sourceTime = fs.statSync(sourcePath).mtimeMs;
        
        if (webpTime > sourceTime) {
          this.skippedCount++;
          return;
        }
      }

      console.log(`🔄 Convirtiendo: ${sourcePath}`);

      // Determinar calidad basada en el nivel
      const quality = this.getQualityForPath(sourcePath);

      await sharp(sourcePath)
        .webp({ 
          quality: quality,
          effort: 6 
        })
        .toFile(webpPath);

      this.processedCount++;
      console.log(`✅ Convertido: ${path.basename(sourcePath)} → ${quality}% calidad`);

    } catch (error) {
      this.errorCount++;
      console.error(`❌ Error: ${sourcePath} - ${error.message}`);
    }
  }

  getQualityForPath(filePath) {
    // Alta calidad para previews y niveles bajos
    if (filePath.includes('preview')) return 85;
    
    // Calidad media para niveles intermedios
    const levelMatch = filePath.match(/\/(\d+)\//);
    if (levelMatch) {
      const level = parseInt(levelMatch[1]);
      if (level <= 2) return 80;
      if (level <= 4) return 70;
    }
    
    // Baja calidad para niveles altos
    return 60;
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE CONVERSIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Convertidos: ${this.processedCount}`);
    console.log(`⏭️  Saltados: ${this.skippedCount}`);
    console.log(`❌ Errores: ${this.errorCount}`);
    console.log('='.repeat(50));
    console.log('\n🎉 ¡Conversión completada!');
    console.log('\n💡 Ejecuta: node update-marzipano.js');
    console.log('   para actualizar los archivos de Marzipano');
  }
}

// Ejecutar
new WebPConverter().convertImages().catch(console.error);