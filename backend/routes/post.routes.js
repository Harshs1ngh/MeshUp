import { Router } from "express";
import { activecheck } from "../controllers/post.controller.js";



const router = Router();



router.route('/').get(activecheck);



export default router;