//for images
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = file.originalname.substring(
            file.originalname.lastIndexOf('.'), 
            file.originalname.length
            );
        cb(null, uniqueSuffix + ext)
    }
});
const imageFilter = function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Configure Multer middleware with storage and file filter
const upload = multer({ 
    storage: storage,
    fileFilter: imageFilter
});

module.exports = upload;