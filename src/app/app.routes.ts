import { Routes } from '@angular/router';
import { LanguageWizardComponent } from './components/language-wizard/language-wizard.component';
import { ScenarioSelectorComponent } from './components/scenario-selector/scenario-selector.component';
import { ConversationViewComponent } from './components/conversation-view/conversation-view.component';
import { SettingsComponent } from './components/settings/settings.component';
import { IntroComponent } from './components/intro/intro.component';
import { HomeComponent } from './components/home/home.component';
import { CostSummaryComponent } from './components/cost-summary/cost-summary.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from './components/terms-of-service/terms-of-service.component';
import { HelpCenterComponent } from './components/help-center/help-center.component';
import { ContactUsComponent } from './components/contact-us/contact-us.component';
import { conversationGuard } from './guards/conversation.guard';
import { languageSetupGuard } from './guards/language-setup.guard';
import { introGuard } from './guards/intro.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'wizard', component: LanguageWizardComponent },
  { path: 'intro', component: IntroComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'terms-of-service', component: TermsOfServiceComponent },
  { path: 'help-center', component: HelpCenterComponent },
  { path: 'contact-us', component: ContactUsComponent },
  {
    path: 'selector',
    component: ScenarioSelectorComponent,
    canActivate: [languageSetupGuard, introGuard]
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
  {
    path: 'cost-summary',
    component: CostSummaryComponent,
    canActivate: [adminGuard]
  },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];
