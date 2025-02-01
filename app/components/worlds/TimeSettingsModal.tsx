import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { World, TimeSlot } from '@/app/types';
import WorldTimeSettings from './WorldTimeSettings';

interface TimeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: World;
  onUpdate: (timeSlots: TimeSlot[]) => Promise<void>;
}

export default function TimeSettingsModal({ isOpen, onClose, world, onUpdate }: TimeSettingsModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-right align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  הגדרת זמנים - {world.name}
                </Dialog.Title>
                
                <WorldTimeSettings 
                  world={world}
                  onUpdate={async (newTimeSlots) => {
                    await onUpdate(newTimeSlots);
                    onClose();
                  }}
                />

                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-primary-100 px-4 py-2 text-sm font-medium text-primary-900 hover:bg-primary-200 focus:outline-none"
                    onClick={onClose}
                  >
                    סגור
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}