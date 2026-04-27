import { Router } from 'express';
import {
  getPublicBlogPosts,
  getPublicBlogPostBySlug,
  getAdminBlogPosts,
  getAdminBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '../controllers/blog.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
  createBlogPostValidation,
  updateBlogPostValidation,
} from '../middleware/validation';

const router = Router();

// Admin GET routes — declared before public /:slug so the literal "admin"
// segment takes precedence in path matching.
router.get('/admin/all', authenticate, getAdminBlogPosts);
router.get('/admin/:id', authenticate, getAdminBlogPostById);

// Public list
router.get('/', getPublicBlogPosts);

// Mutations (protected). PUT/POST/DELETE share their HTTP method with no
// public reads on /:id, so there is no collision with /:slug.
router.post('/', authenticate, createBlogPostValidation, createBlogPost);
router.put('/:id', authenticate, updateBlogPostValidation, updateBlogPost);
router.delete('/:id', authenticate, authorizeAdmin, deleteBlogPost);

// Public detail by slug (last so other GETs above win)
router.get('/:slug', getPublicBlogPostBySlug);

export default router;
