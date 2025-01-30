'use client';
import { useApp } from '@/app/contexts/AppContext';
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, collection, getDocs, updateDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { GoogleCalendarService } from '@/app/services/googleCalendar';
import { CalendarType } from '@/app/types';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { CheckCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import { Switch } from '@headlessui/react';

interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
}

interface ConnectedCalendar {
  id: string;
  name: string;
  summary?: string;
  type: string;
  isActive: boolean;
  color?: string;
  googleCalendarId: string;
  types: CalendarType[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  accessToken?: string;
}

export default function CalendarSetup() {
  const { user, updateGoogleCalendarStatus } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCalendarTypeDialog, setShowCalendarTypeDialog] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<GoogleCalendar | null>(null);
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalendarTypes, setSelectedCalendarTypes] = useState<CalendarType[]>([]);
  const [editingCalendar, setEditingCalendar] = useState<ConnectedCalendar | null>(null);
  const [hasTasksCalendar, setHasTasksCalendar] = useState(false);
  const [isCreatingTasksCalendar, setIsCreatingTasksCalendar] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'new' | 'existing' | ''>('');
  const [newCalendarName, setNewCalendarName] = useState('Pbott Tasks');
  const [newCalendarColor, setNewCalendarColor] = useState('#FF9800');
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);

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
      
      // בדיקה אם קיים יומן משימות לפי הטיפוס
      const tasksCalendarExists = calendarsData.some(cal => cal.type === 'TASKS');
      setHasTasksCalendar(tasksCalendarExists);
      
      setConnectedCalendars(calendarsData);
    } catch (error) {
      console.error('Error loading calendars:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnectedCalendars();
  }, [loadConnectedCalendars]);

  const fetchAvailableCalendars = async (token: string) => {
    try {
      console.log('Fetching calendars with token:', token);
      const calendarService = new GoogleCalendarService(token);
      const response = await calendarService.getCalendarList();
      console.log('Got calendars:', response.items);
      setAvailableCalendars(response.items || []);
      setShowCalendarTypeDialog(true);
    } catch (error) {
      console.error('Error fetching available calendars:', error);
      setError('אירעה שגיאה בטעינת היומנים הזמינים');
    }
  };

  useEffect(() => {
    const action = searchParams.get('action');
    const token = localStorage.getItem('temp_calendar_token');

    if (!token) {
      return;
    }

    switch (action) {
      case 'select_calendar':
        fetchAvailableCalendars(token);
        break;
      case 'create_tasks':
        fetchAvailableCalendars(token);  // נביא את רשימת היומנים
        setSelectedOption('new');         // נבחר אוטומטית באפשרות של יומן חדש
        setShowCalendarTypeDialog(true);  // נפתח את הדיאלוג
        break;
    }
  }, [searchParams]);

  useEffect(() => {
    // Handle reconnection flow
    if (searchParams.get('action') === 'reconnect') {
      const initiateGoogleAuth = async () => {
        try {
          // Clear any existing tokens
          localStorage.removeItem('temp_calendar_token');
          
          const response = await fetch('/api/auth/google-calendar/auth-url');
          if (!response.ok) {
            throw new Error('Failed to get auth URL');
          }
          
          const { url } = await response.json();
          if (!url) {
            throw new Error('No auth URL received');
          }

          console.log('Redirecting to Google auth:', url);
          router.push(url);
        } catch (error) {
          console.error('Failed to initiate Google auth:', error);
          setError('אירעה שגיאה בהתחברות ליומן גוגל');
        }
      };
      
      initiateGoogleAuth();
    }
  }, [searchParams, router]);

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
      // אם זה יומן משימות, נמחק גם מגוגל קלנדר
      if (calendar.type === 'TASKS') {
        const idToken = await auth.currentUser?.getIdToken(true);
        
        const response = await fetch('/api/calendar/delete-tasks-calendar', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            calendarId: calendar.googleCalendarId
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete Google Calendar');
        }
      }
      
      // מחיקה מפיירסטור
      await deleteDoc(
        doc(db, 'users', user.id, 'connectedCalendars', calendar.id)
      );
      
      // עדכון סטטוס אם זה היומן האחרון
      const remainingCalendars = connectedCalendars.filter(c => c.id !== calendar.id);
      if (remainingCalendars.length === 0) {
        await updateGoogleCalendarStatus(false);
      }
      
      // עדכון סטטוס יומן משימות אם רלוונטי
      if (calendar.type === 'TASKS') {
        setHasTasksCalendar(false);
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
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.settings.readonly'
      ];
      
      const state = crypto.randomUUID();
      localStorage.setItem('googleCalendarState', state);
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('include_granted_scopes', 'true');
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');
      authUrl.searchParams.append('state', state);

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setError(error instanceof Error ? error.message : 'אירעה שגיאה בניסיון לחבר יומן חדש');
    }
  };

  const getCalendarsByType = (type: CalendarType) => {
    return connectedCalendars.filter(cal => cal.types.includes(type));
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
        type: selectedCalendarTypes[0] || 'OTHER',
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

  const createTasksCalendar = async (token: string) => {
    if (!user) return;
    
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      
      const response = await fetch('/api/calendar/create-tasks-calendar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'Tasks calendar already exists') {
          setError('יומן משימות כבר קיים במערכת');
        } else {
          throw new Error(data.error || 'Failed to create tasks calendar');
        }
        return;
      }

      // עדכון הרשימה
      await loadConnectedCalendars();
      localStorage.removeItem('temp_calendar_token');
      
    } catch (error) {
      console.error('Error creating tasks calendar:', error);
      setError('אירעה שגיאה ביצירת יומן המשימות');
    }
  };

  const editCalendar = async (calendar: ConnectedCalendar) => {
    try {
      // כאן תוכל להוסיף את הלוגיקה של העריכה
      // למשל, פתיחת מודל עריכה או מעבר לדף עריכה
      console.log('Edit calendar:', calendar);
    } catch (error) {
      console.error('Error editing calendar:', error);
      setError('אירעה שגיאה בעריכת היומן');
    }
  };

  const isEffectivelyConnected = user?.googleCalendarConnected && connectedCalendars.length > 0;

  const handleCreateTasksCalendar = async () => {
    // בדיקה אם כבר יש יומן משימות
    const existingTasksCalendar = connectedCalendars.find(cal => cal.type === 'TASKS');
    if (existingTasksCalendar) {
      setError('יומן משימות כבר קיים במערכת');
      return;
    }

    const token = localStorage.getItem('temp_calendar_token');
    
    if (!token) {
      // אם אין טוקן, נשמור את הפעולה הרצויה ונבקש הזדהות
      localStorage.setItem('calendar_action', 'create_tasks');
      await connectNewCalendar();
      return;
    }

    // פתיחת הדיאלוג עם האפשרויות
    setSelectedOption('new');
    setNewCalendarName('Pbott Tasks');
    setNewCalendarColor('#FF9800');
    setShowCalendarTypeDialog(true);
  };

  const handleTasksCalendarSelection = async () => {
    if (!user) return;
    
    try {
      setIsCreatingCalendar(true);
      
      const token = localStorage.getItem('temp_calendar_token');
      if (!token) throw new Error('No access token found');
      
      const idToken = await auth.currentUser?.getIdToken(true);
      
      if (selectedOption === 'new') {
        // יצירת יומן חדש
        const response = await fetch('/api/calendar/create-tasks-calendar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            token,
            name: newCalendarName,
            color: newCalendarColor
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create calendar');
        }

        const data = await response.json();

        // הוספת היומן החדש ל-Firestore
        const calendarData = {
          id: data.calendarId,
          googleCalendarId: data.calendarId,
          name: newCalendarName,
          type: 'TASKS',
          types: ['TASKS'],
          color: newCalendarColor,
          isActive: true,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDoc(
          doc(db, `users/${user.id}/connectedCalendars/${calendarData.id}`),
          calendarData
        );
      }

      await loadConnectedCalendars();
      setHasTasksCalendar(true);
      localStorage.removeItem('temp_calendar_token');
      setShowCalendarTypeDialog(false);
      setSelectedOption('');
      setSelectedCalendar(null);
      
    } catch (error) {
      console.error('Error handling tasks calendar selection:', error);
      setError('אירעה שגיאה בהגדרת יומן המשימות');
    } finally {
      setIsCreatingCalendar(false);
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
              isEffectivelyConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <div>
              <h2 className="font-semibold">סטטוס חיבור ליומן גוגל</h2>
              <p className={`text-sm ${
                isEffectivelyConnected ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {isEffectivelyConnected 
                  ? 'מחובר לגוגל קלנדר' 
                  : 'לא מחובר לגוגל קלנדר'}
              </p>
            </div>
          </div>
          
          <button
            onClick={connectNewCalendar}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isEffectivelyConnected
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {isEffectivelyConnected 
              ? 'חבר יומן נוסף'
              : 'חבר יומן Google'}
          </button>
        </div>
      </div>

      {/* יומן משימות */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">יומן משימות Pbott</h2>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                hasTasksCalendar ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <div>
                {hasTasksCalendar && (
                  <h3 className="font-medium">
                    {connectedCalendars.find(cal => cal.type === 'TASKS')?.name}
                  </h3>
                )}
                <p className={`text-sm ${
                  hasTasksCalendar ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {hasTasksCalendar 
                    ? 'יומן המשימות מחובר' 
                    : 'יומן ייעודי למשימות המערכת'}
                </p>
              </div>
            </div>
            
            {hasTasksCalendar ? (
              <button
                onClick={() => {
                  const tasksCalendar = connectedCalendars.find(cal => cal.type === 'TASKS');
                  if (tasksCalendar) {
                    removeCalendar(tasksCalendar);
                  }
                }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                disabled={isCreatingTasksCalendar}
              >
                הסר יומן משימות
              </button>
            ) : (
              <button
                onClick={handleCreateTasksCalendar}
                className={`px-4 py-2 rounded-lg ${
                  isEffectivelyConnected
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                צור יומן משימות
              </button>
            )}
          </div>
        </div>
      </section>

      {/* יומנים מחוברים */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">יומנים מחוברים</h2>
        <div className="space-y-4">
          {connectedCalendars.length === 0 ? (
            <p className="text-gray-500">אין יומנים מחוברים</p>
          ) : (
            connectedCalendars
              .filter(calendar => calendar.type !== 'TASKS')
              .map(calendar => (
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

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {showCalendarTypeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingCalendar ? 'עריכת יומן' : 
               searchParams.get('action') === 'create_tasks' ? 'הגדרת יומן משימות' : 
               'הוספת יומן חדש'}
            </h2>
            
            {searchParams.get('action') === 'create_tasks' ? (
              // דיאלוג יומן משימות
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  בחר אפשרות
                </label>
                <div className="space-y-4">
                  {/* אפשרות ליצירת יומן חדש */}
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="calendarOption"
                        value="new"
                        checked={selectedOption === 'new'}
                        onChange={() => setSelectedOption('new')}
                        className="ml-2"
                      />
                      <div>
                        <div className="font-medium">צור יומן משימות חדש</div>
                        <div className="text-sm text-gray-500">יצירת יומן ייעודי למשימות המערכת</div>
                      </div>
                    </label>
                    
                    {selectedOption === 'new' && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">שם היומן</label>
                          <input
                            type="text"
                            value={newCalendarName}
                            onChange={(e) => setNewCalendarName(e.target.value)}
                            placeholder="שם היומן"
                            className="w-full p-2 border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">צבע</label>
                          <input
                            type="color"
                            value={newCalendarColor}
                            onChange={(e) => setNewCalendarColor(e.target.value)}
                            className="w-full h-10 p-1 border rounded-md"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* אפשרות לבחירת יומן קיים */}
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="calendarOption"
                        value="existing"
                        checked={selectedOption === 'existing'}
                        onChange={() => setSelectedOption('existing')}
                        className="ml-2"
                      />
                      <div>
                        <div className="font-medium">בחר יומן קיים</div>
                        <div className="text-sm text-gray-500">הגדר יומן קיים כיומן המשימות שלך</div>
                      </div>
                    </label>

                    {selectedOption === 'existing' && (
                      <div className="mt-4">
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
                  </div>
                </div>
              </div>
            ) : (
              // דיאלוג יומן רגיל
              <>
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
              </>
            )}

            {/* כפתורי פעולה */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCalendarTypeDialog(false);
                  setSelectedOption('');
                  setSelectedCalendar(null);
                  setNewCalendarName('Pbott Tasks');
                  setNewCalendarColor('#FF9800');
                  localStorage.removeItem('temp_calendar_token');
                }}
                className="px-4 py-2 text-neutral-800 hover:bg-neutral-100 rounded-md"
              >
                ביטול
              </button>
              <button
                onClick={searchParams.get('action') === 'create_tasks' ? 
                  handleTasksCalendarSelection : 
                  editingCalendar ? handleUpdateCalendar : handleCalendarSelection}
                disabled={
                  searchParams.get('action') === 'create_tasks' ? 
                    (!selectedOption || (selectedOption === 'existing' && !selectedCalendar)) : 
                    (!editingCalendar && !selectedCalendar)
                }
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {editingCalendar ? 'עדכן' : 'אישור'}
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
              {type === 'PRIMARY' ? 'יומן ראשי' :
               type === 'WORK' ? 'עבודה' :
               type === 'HOME' ? 'בית' :
               type === 'LEISURE' ? 'פנאי' :
               type === 'TASKS' ? 'משימות' : 'אחר'}
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
        {calendar.type === 'TASKS' ? 'הסר יומן משימות' : 'הסר'}
      </button>
    </div>
  </div>
); 