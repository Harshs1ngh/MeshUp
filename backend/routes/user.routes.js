import { Router } from "express";
import { login,
   register,
    upload_profile_picture ,
    updateUserProfile , 
    getUserAndProfile ,
    updateProfileData ,
    get_all_users , } from "../controllers/user.controller.js";
import multer from "multer";

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname)
    }
  });


  const upload = multer({storage: storage})

  router.route('/upload_profile_picture')
    .post(upload.single('profile_picture') , upload_profile_picture);

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/user_data').post(updateUserProfile);
router.route('/getUserAndProfile').get(getUserAndProfile);
router.route('/updateProfileData').get(updateProfileData);
router.route('/get_all_users').get(get_all_users);




export default router;