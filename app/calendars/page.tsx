'use client';
import { useApp } from '@/app/contexts/AppContext';
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { GoogleCalendarService } from '@/lib/services/googleCalendar';
import { ConnectedCalendar, CalendarType } from '@/app/types';
import { useSearchParams } from 'next/navigation';

interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
}

export default function CalendarSetup() {
  const { user, updateGoogleCalendarStatus } = useApp();
  const searchParams = useSearchParams();
  const [showCalendarTypeDialog, setShowCalendarTypeDialog] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<GoogleCalendar | null>(null);
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalendarTypes, setSelectedCalendarTypes] = useState<CalendarType[]>([]);
  const [editingCalendar, setEditingCalendar] = useState<ConnectedCalendar | null>(null);

  const loadConnectedCalendars = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const calendarsRef = collection(db, `users/${user.id}/connectedCalendars`);
      const snapshot = await getDocs(calendarsRef);
      const calendarsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConnectedCalendar[];
      setConnectedCalendars(calendarsData);
      
      // עדכון סטטוס החיבור בהתאם לקיום יומנים
      if (calendarsData.length > 0 && !user.googleCalendarConnected) {
        await updateGoogleCalendarStatus(true);
      } else if (calendarsData.length === 0 && user.googleCalendarConnected) {
        await updateGoogleCalendarStatus(false);
      }
    } catch (error: unknown) {
      console.error('Error loading calendars:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, updateGoogleCalendarStatus]);

  useEffect(() => {
    loadConnectedCalendars();
  }, [loadConnectedCalendars]);

  useEffect(() => {
    if (searchParams.get('action') === 'select_calendar') {
      const token = localStorage.getItem('temp_calendar_token');
      if (token) {
        fetchAvailableCalendars(token);
      }
    }
  }, [searchParams]);

  const toggleCalendarActive = async (calendar: ConnectedCalendar) => {
    if (!user) return;
    
    try {
      const calendarRef = doc(db, 'users', user.id, 'connectedCalendars', calendar.id);
      
      await updateDoc(calendarRef, {
        isActive: !calendar.isActive,
        updatedAt: new Date()
      });
      
      setConnectedCalendars(prev => 
        prev.map(cal => cal.id === calendar.id 
          ? { ...cal, isActive: !cal.isActive }
          : cal
        )
      );
    } catch (error) {
      console.error('Error toggling calendar:', error);
      setError('אירעה שגיאה בעדכון היומן');
    }
  };

  const removeCalendar = async (calendar: ConnectedCalendar) => {
    if (!user || !confirm('האם אתה בטוח שברצונך להסיר יומן זה?')) return;
    
    try {
      await deleteDoc(
        doc(db, 'users', user.id, 'connectedCalendars', calendar.id)
      );
      
      // בדיקה אם זה היומן האחרון
      const remainingCalendars = connectedCalendars.filter(c => c.id !== calendar.id);
      if (remainingCalendars.length === 0) {
        await updateGoogleCalendarStatus(false);
      }
      
      await loadConnectedCalendars();
    } catch (error) {
      console.error('Error removing calendar:', error);
      setError('אירעה שגיאה בהסרת היומן');
    }
  };

  const connectNewCalendar = async () => {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error('Google Client ID is not configured');

      const redirectUri = `${window.location.origin}/auth/calendar-callback`;
      
      const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ];
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'token');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('include_granted_scopes', 'true');
      authUrl.searchParams.append('prompt', 'consent select_account');
      
      window.location.href = authUrl.toString();
    } catch (error) {
      setError('אירעה שגיאה בניסיון לחבר יומן חדש');
      console.error(error);
    }
  };

  const getCalendarsByType = (type: CalendarType) => {
    return connectedCalendars.filter(cal => cal.types.includes(type));
  };

  const fetchAvailableCalendars = async (token: string) => {
    try {
      const calendarService = new GoogleCalendarService(token);
      const response = await calendarService.getCalendarList();
      setAvailableCalendars(response.items || []);
      setShowCalendarTypeDialog(true);
    } catch (error) {
      console.error('Error fetching available calendars:', error);
      setError('אירעה שגיאה בטעינת היומנים הזמינים');
    }
  };

  const handleCalendarSelection = async () => {
    if (!selectedCalendar || !user) return;
    
    try {
      const token = localStorage.getItem('temp_calendar_token');
      if (!token) throw new Error('No access token found');

      const calendarData: ConnectedCalendar = {
        id: selectedCalendar.id,
        googleCalendarId: selectedCalendar.id,
        name: selectedCalendar.summary,
        types: selectedCalendarTypes,
        color: selectedCalendar.backgroundColor,
        isActive: true,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(
        doc(db, `users/${user.id}/connectedCalendars/${calendarData.id}`),
        calendarData
      );
      
      localStorage.removeItem('temp_calendar_token');
      await loadConnectedCalendars();
      
      setShowCalendarTypeDialog(false);
      setSelectedCalendar(null);
      setSelectedCalendarTypes([]);
    } catch (error) {
      console.error('Error saving calendar:', error);
      setError('אירעה שגיאה בשמירת היומן');
    }
  };

  const handleEditCalendar = (calendar: ConnectedCalendar) => {
    setEditingCalendar(calendar);
    setSelectedCalendarTypes(calendar.types as CalendarType[]);
    setShowCalendarTypeDialog(true);
  };

  const handleUpdateCalendar = async () => {
    if (!editingCalendar || !user) return;

    try {
      const updatedCalendar = {
        ...editingCalendar,
        types: selectedCalendarTypes,
        updatedAt: new Date()
      };

      await setDoc(
        doc(db, 'users', user.id, 'connectedCalendars', editingCalendar.id),
        updatedCalendar
      );
      
      await loadConnectedCalendars();
      
      setShowCalendarTypeDialog(false);
      setEditingCalendar(null);
      setSelectedCalendarTypes([]);
    } catch (error) {
      console.error('Error updating calendar:', error);
      setError('אירעה שגיאה בעדכון היומן');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">הגדרות יומן</h1>

      {/* סטטוס חיבור */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              user?.googleCalendarConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <div>
              <h2 className="font-semibold">סטטוס חיבור ליומן גוגל</h2>
              <p className={`text-sm ${
                user?.googleCalendarConnected ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {user?.googleCalendarConnected 
                  ? 'מחובר לגוגל קלנדר' 
                  : 'לא מחובר לגוגל קלנדר'}
              </p>
            </div>
          </div>
          
          <button
            onClick={connectNewCalendar}
            className={`px-4 py-2 rounded-lg transition-colors ${
              user?.googleCalendarConnected
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {user?.googleCalendarConnected 
              ? 'חבר יומן נוסף'
              : 'חבר יומן Google'}
          </button>
        </div>
      </div>

      {/* יומנים מחוברים */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">יומנים מחוברים</h2>
        <div className="space-y-4">
          {connectedCalendars.length === 0 ? (
            <p className="text-gray-500">אין יומנים מחוברים</p>
          ) : (
            connectedCalendars.map(calendar => (
              <CalendarCard
                key={calendar.id}
                calendar={calendar}
                onEdit={handleEditCalendar}
                onToggle={toggleCalendarActive}
                onRemove={removeCalendar}
              />
            ))
          )}
        </div>
      </section>

      {/* דיאלוג בחירת יומן */}
      {showCalendarTypeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingCalendar ? 'עריכת יומן' : 'הוספת יומן חדש'}
            </h2>
            
            {/* בחירת יומן - רק להוספה חדשה */}
            {!editingCalendar && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  בחר יומן
                </label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedCalendar?.id || ''}
                  onChange={(e) => {
                    const calendar = availableCalendars.find(c => c.id === e.target.value);
                    setSelectedCalendar(calendar || null);
                  }}
                >
                  <option value="">בחר יומן...</option>
                  {availableCalendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* בחירת סוגים מרובים */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                סוגי יומן (ניתן לבחור מספר אפשרויות)
              </label>
              <div className="space-y-2">
                {(['PRIMARY', 'WORK', 'HOME', 'LEISURE', 'OTHER'] as CalendarType[]).map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCalendarTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCalendarTypes(prev => [...prev, type]);
                        } else {
                          setSelectedCalendarTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                      className="mr-2"
                    />
                    {type === 'PRIMARY' ? 'יומן ראשי' :
                     type === 'WORK' ? 'עבודה' :
                     type === 'HOME' ? 'בית' :
                     type === 'LEISURE' ? 'פנאי' : 'אחר'}
                  </label>
                ))}
              </div>
            </div>

            {/* כפתורי פעולה */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCalendarTypeDialog(false);
                  setEditingCalendar(null);
                  setSelectedCalendarTypes([]);
                  localStorage.removeItem('temp_calendar_token');
                }}
                className="px-4 py-2 text-neutral-800 hover:bg-neutral-100 rounded-md"
              >
                ביטול
              </button>
              <button
                onClick={editingCalendar ? handleUpdateCalendar : handleCalendarSelection}
                disabled={!editingCalendar && !selectedCalendar}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {editingCalendar ? 'עדכן' : 'הוסף'} יומן
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// קומפוננטת כרטיס יומן
const CalendarCard = ({ 
  calendar,
  onEdit,
  onToggle,
  onRemove 
}: { 
  calendar: ConnectedCalendar;
  onEdit: (calendar: ConnectedCalendar) => void;
  onToggle: (calendar: ConnectedCalendar) => void;
  onRemove: (calendar: ConnectedCalendar) => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-300">
    <div className="flex items-center space-x-4">
      <div 
        className="w-4 h-4 rounded-full" 
        style={{ backgroundColor: calendar.color || '#666' }}
      />
      <div className="mr-4">
        <h3 className="font-medium">{calendar.name}</h3>
        <div className="flex gap-2 mt-1">
          {calendar.types.map(type => (
            <span key={type} className="text-xs px-2 py-1 bg-gray-200 rounded-full">
              {type === 'PRIMARY' ? 'ראשי' :
               type === 'WORK' ? 'עבודה' :
               type === 'HOME' ? 'בית' :
               type === 'LEISURE' ? 'פנאי' : 'אחר'}
            </span>
          ))}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button 
        onClick={() => onEdit(calendar)}
        className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
      >
        ערוך
      </button>
      <button 
        onClick={() => onToggle(calendar)}
        className={`px-3 py-1 rounded text-sm ${
          calendar.isActive 
            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
            : 'bg-neutral-100 text-neutral-900 hover:bg-gray-200'
        }`}
      >
        {calendar.isActive ? 'פעיל' : 'לא פעיל'}
      </button>
      <button 
        onClick={() => onRemove(calendar)}
        className="px-3 py-1 rounded text-sm text-red-600 hover:bg-red-50"
      >
        הסר
      </button>
    </div>
  </div>
); 