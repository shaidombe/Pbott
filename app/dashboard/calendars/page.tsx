'use client';
import { useApp } from '@/app/contexts/AppContext';
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { GoogleCalendarService } from '@/app/lib/services/googleCalendar';
import { ConnectedCalendar, CalendarType } from '@/app/types';
import { useSearchParams } from 'next/navigation';

interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
}

export default function CalendarSetup() {
  const { user } = useApp();
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
    } catch (error: unknown) {
      console.error('Error loading calendars:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* יומן ראשי */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="text-2xl mr-2">📅</span> יומן ראשי
        </h2>
        <div className="space-y-4">
          {getCalendarsByType('PRIMARY').map(calendar => (
            <CalendarCard
              key={calendar.id}
              calendar={calendar}
              onEdit={handleEditCalendar}
              onToggle={toggleCalendarActive}
              onRemove={removeCalendar}
            />
          ))}
          {getCalendarsByType('PRIMARY').length === 0 && (
            <p className="text-neutral-700">לא הוגדר יומן ראשי</p>
          )}
        </div>
      </section>

      {/* יומני עבודה */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="text-2xl mr-2">💼</span> יומני עבודה
        </h2>
        <div className="space-y-4">
          {getCalendarsByType('WORK').map(calendar => (
            <CalendarCard
              key={calendar.id}
              calendar={calendar}
              onEdit={handleEditCalendar}
              onToggle={toggleCalendarActive}
              onRemove={removeCalendar}
            />
          ))}
        </div>
      </section>

      {/* יומני בית */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="text-2xl mr-2">🏠</span> יומני בית
        </h2>
        <div className="space-y-4">
          {getCalendarsByType('HOME').map(calendar => (
            <CalendarCard
              key={calendar.id}
              calendar={calendar}
              onEdit={handleEditCalendar}
              onToggle={toggleCalendarActive}
              onRemove={removeCalendar}
            />
          ))}
        </div>
      </section>

      {/* יומני פנאי */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="text-2xl mr-2">🎮</span> יומני פנאי
        </h2>
        <div className="space-y-4">
          {getCalendarsByType('LEISURE').map(calendar => (
            <CalendarCard
              key={calendar.id}
              calendar={calendar}
              onEdit={handleEditCalendar}
              onToggle={toggleCalendarActive}
              onRemove={removeCalendar}
            />
          ))}
        </div>
      </section>

      {/* הוספת יומן חדש */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">הוסף יומן חדש</h2>
        <button
          onClick={connectNewCalendar}
          className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
        >
          חבר יומן Google חדש
        </button>
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