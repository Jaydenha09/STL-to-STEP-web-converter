const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const util = require('util');

const execPromise = util.promisify(exec);

class ConverterService {
  /**
   * Convert STL to STEP format using FreeCAD CLI
   */
  async convertSTLtoSTEP(inputPath, outputPath) {
    try {
      const command = `freecadcmd -c "import Part; import Mesh; import FreeCAD; import Import; mesh = Mesh.read('${inputPath}'); shape = Part.Shape(); shape.makeShapeFromMesh(mesh.Topology, 0.01); doc = FreeCAD.newDocument('STLImport'); obj = doc.addObject('Part::Feature', 'MeshShape'); obj.Shape = shape; Import.export([obj], '${outputPath}'); FreeCAD.closeDocument('STLImport')"`;
      
      const { stdout, stderr } = await execPromise(command);
      
      return { success: true, outputPath };
    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }



  async getFileInfo(filePath) {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }
}

module.exports = new ConverterService();