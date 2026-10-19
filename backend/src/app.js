import express from 'express';
import authRoutes from './routes/auth.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import userRoutes from './routes/user.routes.js';
import customerRoutes from './routes/customer.routes.js';
import creditRoutes from './routes/credit.routes.js';
import paymentRoutes from './routes/payment.routes.js';

// ...
const app = express();

app.use(express.json());
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credit-entries', creditRoutes);

// ...
app.use('/api/customers', customerRoutes);
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Holy Pharmacy API is running',
  });
});

app.use('/api/auth', authRoutes);

// These two must stay last.
app.use(notFound);
app.use(errorHandler);

export default app;