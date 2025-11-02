import { Routes } from '@angular/router';
import { LanguageWizardComponent } from './components/language-wizard/language-wizard.component';
import { ScenarioSelectorComponent } from './components/scenario-selector/scenario-selector.component';
import { ConversationViewComponent } from './components/conversation-view/conversation-view.component';
import { SettingsComponent } from './components/settings/settings.component';
import { conversationGuard } from './guards/conversation.guard';
import { languageSetupGuard } from './guards/language-setup.guard';

export const routes: Routes = [
  { path: 'wizard', component: LanguageWizardComponent },
  { 
    path: 'selector', 
    component: ScenarioSelectorComponent, 
    canActivate: [languageSetupGuard] 
  },
  { 
    path: 'conversation', 
    component: ConversationViewComponent, 
    canActivate: [languageSetupGuard, conversationGuard] 
  },
  { 
    path: 'settings', 
    component: SettingsComponent,
    canActivate: [languageSetupGuard]
  },
  { path: '', redirectTo: '/selector', pathMatch: 'full' },
  { path: '**', redirectTo: '/selector' }
];
