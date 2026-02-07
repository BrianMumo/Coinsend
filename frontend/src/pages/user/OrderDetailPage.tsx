import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { ordersApi } from '../../api/orders.api';
import { Order, PaymentInstructions } from '../../types';
import { formatCurrency, formatDate, formatOrderType, formatStatus, truncateAddress } from '../../utils/formatters';
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Smartphone,
} from 'lucide-react';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [stkPhone, setStkPhone] = useState('');
  const [isInitiatingSTK, setIsInitiatingSTK] = useState(false);
  const [stkMessage, setStkMessage] = useState<string | null>(null);
  const [isPollingPayment, setIsPollingPayment] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;

      try {
        const response = await ordersApi.getById(id);
        if (response.success && response.data) {
          setOrder(response.data.order);
          setPaymentInstructions(response.data.paymentInstructions);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitProof = async () => {
    if (!id || !proofUrl) return;

    setIsSubmittingProof(true);
    try {
      const response = await ordersApi.submitProof(id, proofUrl, paymentReference);
      if (response.success && response.data) {
        setOrder(response.data.order);
        setError(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit proof');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!id || !confirm('Are you sure you want to cancel this order?')) return;

    try {
      const response = await ordersApi.cancel(id);
      if (response.success && response.data) {
        setOrder(response.data.order);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to cancel order');
    }
  };

  const handleSTKPush = async () => {
    if (!id || !stkPhone) return;

    setIsInitiatingSTK(true);
    setStkMessage(null);
    setError(null);

    try {
      const response = await ordersApi.initiateSTKPush(id, stkPhone);
      if (response.success) {
        setStkMessage(response.data?.message || 'Check your phone for the M-Pesa prompt');
        // Start polling for payment status
        setIsPollingPayment(true);
        pollPaymentStatus();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setIsInitiatingSTK(false);
    }
  };

  const pollPaymentStatus = async () => {
    if (!id) return;

    const maxAttempts = 60; // Poll for 2 minutes (every 2 seconds)
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsPollingPayment(false);
        setStkMessage('Payment timeout. Please try again or use manual payment.');
        return;
      }

      try {
        const response = await ordersApi.checkPaymentStatus(id);
        if (response.success && response.data?.isPaid) {
          // Refresh order data
          const orderResponse = await ordersApi.getById(id);
          if (orderResponse.success && orderResponse.data) {
            setOrder(orderResponse.data.order);
            setPaymentInstructions(orderResponse.data.paymentInstructions);
          }
          setIsPollingPayment(false);
          setStkMessage('Payment received successfully!');
          return;
        }
      } catch (err) {
        // Continue polling even on error
      }

      attempts++;
      setTimeout(poll, 2000);
    };

    poll();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="error">
        {error || 'Order not found'}
      </Alert>
    );
  }

  const statusIcons: Record<string, typeof CheckCircle> = {
    PENDING: Clock,
    PAID: Clock,
    PROCESSING: Clock,
    COMPLETED: CheckCircle,
    FAILED: AlertCircle,
    CANCELLED: AlertCircle,
    EXPIRED: AlertCircle,
  };

  const StatusIcon = statusIcons[order.status] || Clock;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageTitle
        title={order ? `Order ${order.orderNumber}` : 'Order Details'}
        description="View order details and track your transaction status."
      />
      <Link to="/orders" className="inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Link>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Order Header */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <p className="text-gray-600">{formatOrderType(order.orderType)}</p>
            </div>
            <Badge variant={getStatusVariant(order.status)} className="text-sm px-3 py-1">
              <StatusIcon className="h-4 w-4 mr-1" />
              {formatStatus(order.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">You Send</p>
              <p className="font-semibold text-lg">
                {formatCurrency(order.sourceAmount, order.sourceCurrency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">You Receive</p>
              <p className="font-semibold text-lg">
                {formatCurrency(order.destinationAmount, order.destinationCurrency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Exchange Rate</p>
              <p className="font-medium">
                1 {order.sourceCurrency} = {parseFloat(order.exchangeRate).toFixed(4)}{' '}
                {order.destinationCurrency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fee</p>
              <p className="font-medium">
                {formatCurrency(order.fee, order.sourceCurrency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{formatDate(order.createdAt)}</p>
            </div>
            {order.payoutDestination && (
              <div>
                <p className="text-sm text-gray-500">Payout To</p>
                <p className="font-medium">
                  {order.payoutDestination.length > 20
                    ? truncateAddress(order.payoutDestination)
                    : order.payoutDestination}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      {paymentInstructions && order.status === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="info">
              {paymentInstructions.message}
            </Alert>

            {paymentInstructions.type === 'crypto_deposit' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Wallet Address</p>
                    <p className="font-mono text-sm break-all">
                      {paymentInstructions.details.walletAddress}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(paymentInstructions.details.walletAddress, 'address')
                    }
                  >
                    {copied === 'address' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Network: {paymentInstructions.details.network}
                </p>
                <p className="text-sm text-gray-600">
                  Amount: {paymentInstructions.details.amount} {paymentInstructions.details.currency}
                </p>
              </div>
            )}

            {paymentInstructions.type === 'mpesa_payment' && (
              <div className="space-y-4">
                {/* STK Push Option */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    Pay with M-Pesa (Recommended)
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    Enter your phone number and receive a payment prompt directly on your phone.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="0712345678"
                      value={stkPhone}
                      onChange={(e) => setStkPhone(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSTKPush}
                      isLoading={isInitiatingSTK || isPollingPayment}
                      disabled={!stkPhone || isPollingPayment}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isPollingPayment ? 'Waiting...' : 'Pay Now'}
                    </Button>
                  </div>
                  {stkMessage && (
                    <Alert variant={stkMessage.includes('success') ? 'success' : 'info'} className="mt-3">
                      {stkMessage}
                    </Alert>
                  )}
                </div>

                {/* Manual Payment Option */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-3">Or pay manually via M-Pesa:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Paybill Number</p>
                      <p className="font-bold text-lg">{paymentInstructions.details.paybillNumber}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Account Number</p>
                      <p className="font-bold text-lg">{paymentInstructions.details.accountNumber}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Amount: KES {parseFloat(paymentInstructions.details.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 italic">{paymentInstructions.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Submit Payment Proof */}
      {order.status === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Payment Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Proof URL / Screenshot Link"
              placeholder="https://example.com/proof.png"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              helperText="Upload your payment screenshot to an image hosting service and paste the link"
            />
            <Input
              label="Payment Reference (Optional)"
              placeholder="M-Pesa confirmation code or transaction hash"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                onClick={handleSubmitProof}
                isLoading={isSubmittingProof}
                disabled={!proofUrl}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Proof
              </Button>
              <Button variant="outline" onClick={handleCancelOrder}>
                Cancel Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline order={order} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailPage;
