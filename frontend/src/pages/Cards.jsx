import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Cards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [flippedCard, setFlippedCard] = useState(null);
  const [showCVV, setShowCVV] = useState(null);

  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
  });

  const [formError, setFormError] = useState('');

  /* LOAD FROM STORAGE */
  useEffect(() => {
    const saved = localStorage.getItem('cards');
    if (saved) {
      setCards(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const saveCards = (updated) => {
    setCards(updated);
    localStorage.setItem('cards', JSON.stringify(updated));
  };

  /* FORMAT INPUT */
  const handleInputChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cardNumber') {
      value = value.replace(/\D/g, '').slice(0, 16);
      value = value.replace(/(.{4})/g, '$1 ').trim();
    }

    if (name === 'expiryDate') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 3) {
        value = value.slice(0, 2) + '/' + value.slice(2);
      }
    }

    if (name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 3);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* ADD CARD */
  const handleAddCard = () => {
    const { cardNumber, expiryDate, cvv, cardHolder } = formData;

    if (!cardNumber || !expiryDate || !cvv || !cardHolder) {
      setFormError('All fields are required');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setFormError('Card number must be 16 digits');
      return;
    }

    if (cvv.length !== 3) {
      setFormError('CVV must be 3 digits');
      return;
    }

    const lastFour = cardNumber.slice(-4);
    const cardType = cardNumber.startsWith('5') ? 'Mastercard' : 'Visa';

    const newCard = {
      id: Date.now(),
      cardNumber: `**** **** **** ${lastFour}`,
      cardHolder,
      expiryDate,
      cvv,
      type: cardType,
      balance: 0,
      limit: 5000,
      frozen: false,
      color:
        cardType === 'Visa'
          ? 'linear-gradient(to right, #3b82f6, #8b5cf6)'
          : 'linear-gradient(to right, #ef4444, #f97316)',
    };

    saveCards([...cards, newCard]);

    setFormData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolder: '',
    });

    setFormError('');
    setShowAddCard(false);
  };

  const handleDelete = (id) => {
    saveCards(cards.filter(c => c.id !== id));
  };

  const toggleFreeze = (id) => {
    const updated = cards.map(card =>
      card.id === id ? { ...card, frozen: !card.frozen } : card
    );
    saveCards(updated);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cards</h1>
          <p className="text-gray-600">Manage your credit and debit cards</p>
        </div>
        <button
          onClick={() => setShowAddCard(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add New Card</span>
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => {
          const usagePercent = (card.balance / card.limit) * 100;

          return (
            <div key={card.id}>
              <div className="perspective">
                <div
                  className={`card-container ${
                    flippedCard === card.id ? 'flipped' : ''
                  }`}
                  onClick={() =>
                    setFlippedCard(
                      flippedCard === card.id ? null : card.id
                    )
                  }
                >
                  {/* FRONT */}
                  <div
                    className="card-face p-6 text-orange flex flex-col justify-between"
                    style={{
                      backgroundImage: card.color,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >

                    <div className="flex justify-between">
                      <p>{card.type}</p>
                      <CreditCardIcon className="w-8 h-8" />
                    </div>
                    <p className="text-xl font-bold mt-8">
                      {card.cardNumber}
                    </p>
                    <div className="flex justify-between mt-6">
                      <div>
                        <p className="text-xs opacity-70">Holder</p>
                        <p>{card.cardHolder}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-70">Expires</p>
                        <p>{card.expiryDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* BACK */}
                  <div className="card-face card-back bg-gray-900 p-6 text-white">
                    <p>CVV</p>
                    <p className="text-xl">
                      {showCVV === card.id ? card.cvv : '***'}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCVV(
                          showCVV === card.id ? null : card.id
                        );
                      }}
                    >
                      {showCVV === card.id ? (
                        <EyeSlashIcon className="w-6 h-6 mt-2" />
                      ) : (
                        <EyeIcon className="w-6 h-6 mt-2" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-between mt-4">
                <button onClick={() => toggleFreeze(card.id)}>
                  {card.frozen ? (
                    <LockClosedIcon className="w-6 h-6 text-red-500" />
                  ) : (
                    <LockOpenIcon className="w-6 h-6 text-green-500" />
                  )}
                </button>
                <button onClick={() => handleDelete(card.id)}>
                  <TrashIcon className="w-6 h-6 text-red-500" />
                </button>
              </div>

              {/* USAGE */}
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Used: {formatCurrency(card.balance)}</span>
                  <span>Limit: {formatCurrency(card.limit)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Usage</span>
                  <span>{usagePercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CARD MODAL */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Card</h3>

            <input
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleInputChange}
              placeholder="Card Number"
              className="input-field mb-2"
            />
            <input
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleInputChange}
              placeholder="MMYY"
              className="input-field mb-2"
            />
            <input
              name="cvv"
              value={formData.cvv}
              onChange={handleInputChange}
              placeholder="CVV"
              className="input-field mb-2"
            />
            <input
              name="cardHolder"
              value={formData.cardHolder}
              onChange={handleInputChange}
              placeholder="Card Holder"
              className="input-field mb-2"
            />

            {formError && <p className="text-red-500 text-sm">{formError}</p>}

            <div className="flex justify-end mt-4 space-x-2">
              <button onClick={() => setShowAddCard(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddCard} className="btn-primary">
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cards;
